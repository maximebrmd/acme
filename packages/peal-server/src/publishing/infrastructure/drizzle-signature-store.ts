import { and, asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { SignatureStore } from "#publishing/application/signature-store.ts";
import { Signature } from "#publishing/domain/signature.ts";
import { tagKeyOf } from "#publishing/domain/tag.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { signatures } from "./schema.ts";

type Row = typeof signatures.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodeSignature = Schema.decodeUnknownEffect(Signature);

const failed = (cause: unknown) => new DatabaseError({ cause });

const scopeOf = (row: Row) => {
  if (row.scope === "platform") {
    return { _tag: row.scope, platform: row.scopePlatform };
  }

  return row.scope === "channel"
    ? { _tag: row.scope, channelId: row.scopeChannelId }
    : { _tag: row.scope };
};

const toSignature = (row: Row) =>
  decodeSignature({
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    id: row.id,
    isDefault: row.isDefault,
    name: row.name,
    scope: scopeOf(row),
    text: row.text,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

// What a member writes of a signature, as its columns hold it.
const written = ({ isDefault, name, scope, text }: Signature) => ({
  isDefault,
  name,
  nameKey: tagKeyOf(name),
  scope: scope._tag,
  scopeChannelId: scope._tag === "channel" ? scope.channelId : null,
  scopePlatform: scope._tag === "platform" ? scope.platform : null,
  text,
});

/** Signatures in the publishing schema, through Drizzle. */
export const DrizzleSignatureStore = Layer.effect(
  SignatureStore,
  Effect.gen(function* DrizzleSignatureStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return SignatureStore.of({
      // A transaction's advisory lock, in the two-key form: the first key
      // names what is claimed, the second the workspace.
      claim: (workspaceId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/signatures'), hashtext(${workspaceId}))`.pipe(
          Effect.mapError(failed),
          Effect.asVoid
        ),
      insert: (signature) =>
        db
          .insert(signatures)
          .values({
            ...written(signature),
            createdAt: DateTime.toDateUtc(signature.createdAt),
            id: signature.id,
            workspaceId: signature.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      list: (workspaceId) =>
        db
          .select()
          .from(signatures)
          .where(eq(signatures.workspaceId, workspaceId))
          .orderBy(asc(signatures.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toSignature))
          ),
      remove: (workspaceId, signatureId) =>
        db
          .delete(signatures)
          .where(
            and(
              eq(signatures.workspaceId, workspaceId),
              eq(signatures.id, signatureId)
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      update: (signature) =>
        db
          .update(signatures)
          .set(written(signature))
          .where(
            and(
              eq(signatures.workspaceId, signature.workspaceId),
              eq(signatures.id, signature.id)
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
