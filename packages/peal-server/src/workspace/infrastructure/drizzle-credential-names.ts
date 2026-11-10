import { and, eq } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { CredentialNames } from "#workspace/application/credential-names.ts";

import { apikey, oauthClient } from "./auth-schema.generated.ts";
import { partnerKeys, partnerWorkspaces } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

// Better Auth keeps a key's id as a UUID: anything else names no key.
const isUuid = Schema.is(Schema.String.check(Schema.isUUID()));

// A name that says something: Better Auth stores none as null, or empty.
const nameOf = (rows: readonly { readonly name: string | null }[]) =>
  Option.fromNullishOr(rows[0]?.name).pipe(
    Option.map((name) => name.trim()),
    Option.filter((name) => name !== "")
  );

/**
 * CredentialNames, read from Better Auth's tables, and, for a partner key
 * acting in a workspace its partner owns, from the partner's keys.
 */
export const DrizzleCredentialNames = Layer.effect(
  CredentialNames,
  Effect.gen(function* DrizzleCredentialNames() {
    const db = yield* Drizzle;

    // The name of a key of the partner that owns the workspace.
    const partnerKey = (workspaceId: string, keyId: string) =>
      db
        .select({ name: partnerKeys.name })
        .from(partnerKeys)
        .innerJoin(
          partnerWorkspaces,
          eq(partnerWorkspaces.partnerId, partnerKeys.partnerId)
        )
        .where(
          and(
            eq(partnerKeys.id, keyId),
            eq(partnerWorkspaces.workspaceId, workspaceId)
          )
        )
        .limit(1)
        .pipe(Effect.mapError(failed), Effect.map(nameOf));

    return CredentialNames.of({
      apiKey: (workspaceId, apiKeyId) =>
        isUuid(apiKeyId)
          ? db
              .select({ name: apikey.name })
              .from(apikey)
              .where(
                and(
                  eq(apikey.id, apiKeyId),
                  eq(apikey.referenceId, workspaceId)
                )
              )
              .limit(1)
              .pipe(
                Effect.mapError(failed),
                Effect.map(nameOf),
                Effect.flatMap(
                  Option.match({
                    onNone: () => partnerKey(workspaceId, apiKeyId),
                    onSome: (name) => Effect.succeed(Option.some(name)),
                  })
                )
              )
          : Effect.succeed(Option.none()),
      application: (clientId) =>
        db
          .select({ name: oauthClient.name })
          .from(oauthClient)
          .where(eq(oauthClient.clientId, clientId))
          .limit(1)
          .pipe(Effect.mapError(failed), Effect.map(nameOf)),
    });
  })
);
