import { and, eq } from "drizzle-orm";
import type { Redacted } from "effect";
import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { MissingTokenKey } from "#channels/application/missing-token-key.ts";
import {
  appSecretContext,
  EncryptedTokenSchema,
  TokenCipher,
} from "#channels/application/token-cipher.ts";
import { mastodonApps } from "#channels/infrastructure/schema.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

/** Peal's app on one instance, for one redirect URI. */
export interface MastodonApp {
  readonly clientId: string;
  readonly clientSecret: Redacted.Redacted;
  readonly instance: string;
  readonly redirectUri: string;
  readonly scopes: string;
}

const decodeSecret = Schema.decodeUnknownEffect(EncryptedTokenSchema);

const failed = (cause: unknown) => new DatabaseError({ cause });

/**
 * The apps Peal registered on Mastodon instances: registered once per
 * instance and redirect URI, then reused by every workspace. Instances no
 * longer delete unused apps (since 4.3), so they are kept for good.
 */
export class MastodonApps extends Context.Service<
  MastodonApps,
  {
    readonly registered: (
      instance: string,
      redirectUri: string
    ) => Effect.Effect<Option.Option<MastodonApp>, DatabaseError>;
    /**
     * Keeps a newly registered app, unless another process registered one
     * first: the one kept is returned, and the other is never used.
     */
    readonly save: (
      app: MastodonApp
    ) => Effect.Effect<MastodonApp, DatabaseError | MissingTokenKey>;
    /**
     * Keeps a newly registered app in place of the one registered before,
     * whose scopes no longer cover what Peal asks for. A sign-in begun with
     * the old app a moment before cannot complete, and is started again.
     */
    readonly replace: (
      app: MastodonApp
    ) => Effect.Effect<MastodonApp, DatabaseError | MissingTokenKey>;
  }
>()("peal-server/channels/infrastructure/MastodonApps") {
  static readonly layer = Layer.effect(
    MastodonApps,
    Effect.gen(function* MastodonAppsLive() {
      const db = yield* Drizzle;
      const cipher = yield* TokenCipher;

      const registered = Effect.fn("MastodonApps.registered")(
        function* registered(instance: string, redirectUri: string) {
          const [row] = yield* db
            .select()
            .from(mastodonApps)
            .where(
              and(
                eq(mastodonApps.instance, instance),
                eq(mastodonApps.redirectUri, redirectUri)
              )
            )
            .pipe(Effect.mapError(failed));

          if (row === undefined) {
            return Option.none<MastodonApp>();
          }

          const clientSecret = yield* decodeSecret(row.clientSecret).pipe(
            Effect.flatMap((encrypted) =>
              cipher.decryptSecret(encrypted, appSecretContext(instance))
            ),
            Effect.orDie
          );

          const app: MastodonApp = {
            clientId: row.clientId,
            clientSecret,
            instance,
            redirectUri,
            scopes: row.scopes,
          };

          return Option.some(app);
        }
      );

      // The app's row, its secret encrypted for the instance.
      const rowOf = Effect.fn("MastodonApps.rowOf")(function* rowOf(
        app: MastodonApp
      ) {
        const clientSecret = yield* cipher.encryptSecret(
          app.clientSecret,
          appSecretContext(app.instance)
        );

        const now = yield* DateTime.now;

        return {
          clientId: app.clientId,
          clientSecret,
          createdAt: DateTime.toDateUtc(now),
          instance: app.instance,
          redirectUri: app.redirectUri,
          scopes: app.scopes,
        };
      });

      const save = Effect.fn("MastodonApps.save")(function* save(
        app: MastodonApp
      ) {
        yield* db
          .insert(mastodonApps)
          .values(yield* rowOf(app))
          .onConflictDoNothing()
          .pipe(Effect.mapError(failed));

        const kept = yield* registered(app.instance, app.redirectUri);

        return Option.getOrElse(kept, () => app);
      });

      const replace = Effect.fn("MastodonApps.replace")(function* replace(
        app: MastodonApp
      ) {
        const row = yield* rowOf(app);

        yield* db
          .insert(mastodonApps)
          .values(row)
          .onConflictDoUpdate({
            set: {
              clientId: row.clientId,
              clientSecret: row.clientSecret,
              createdAt: row.createdAt,
              scopes: row.scopes,
            },
            target: [mastodonApps.instance, mastodonApps.redirectUri],
          })
          .pipe(Effect.mapError(failed));

        return app;
      });

      return MastodonApps.of({ registered, replace, save });
    })
  );
}
