import { and, eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { PlatformUserGrants } from "#channels/application/platform-user-grants.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { date, failed } from "./rows.ts";
import { grants } from "./schema.ts";
import { lockUserSpending } from "./spending-locks.ts";

// The sign-ins to Meta's ad network of one Facebook user.
const ofUser = (platformUserId: string) =>
  and(eq(grants.network, "meta"), eq(grants.platformUserId, platformUserId));

/**
 * Meta's requests about a Facebook user, applied to their sign-ins to
 * Meta's ad network, which run on Meta's main app: the `facebook` app's
 * callbacks. A data deletion removes the sign-ins with their tokens, the
 * ad accounts they connect and what Peal kept of them; ads that run at
 * Meta are Meta's to stop, as the user removed Peal's access to them. A
 * deauthorization marks the sign-ins as needing their person again.
 */
export const AdsPlatformUserGrants = Layer.effect(
  PlatformUserGrants,
  Effect.gen(function* AdsPlatformUserGrants() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return {
      deauthorized: (app, platformUserId) =>
        app === "facebook"
          ? DateTime.now.pipe(
              Effect.flatMap((now) =>
                db
                  .update(grants)
                  .set({ access: "reconnectNeeded", updatedAt: date(now) })
                  .where(ofUser(platformUserId))
              ),
              Effect.mapError(failed),
              Effect.asVoid
            )
          : Effect.void,
      // After any boost of the user's accounts being asked for or checked
      // before it runs, which then finds no account.
      erase: (app, platformUserId) =>
        app === "facebook"
          ? lockUserSpending(client, platformUserId).pipe(
              Effect.andThen(
                db
                  .delete(grants)
                  .where(ofUser(platformUserId))
                  .returning({ id: grants.id })
              ),
              client.withTransaction,
              Effect.mapError(failed),
              Effect.tap((erased) =>
                erased.length > 0
                  ? Effect.logInfo(
                      "Erased ad network sign-ins on a platform's data deletion request"
                    ).pipe(Effect.annotateLogs({ grants: erased.length }))
                  : Effect.void
              ),
              Effect.asVoid
            )
          : Effect.void,
    };
  })
);
