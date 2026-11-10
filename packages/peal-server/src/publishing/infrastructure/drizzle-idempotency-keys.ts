import { and, eq, gt, lte } from "drizzle-orm";
import { DateTime, Effect, Layer, Option } from "effect";
import { Digest } from "effect/crypto";

import { IdempotencyKeys } from "#publishing/application/idempotency-keys.ts";
import type {
  KeyedRequest,
  KeyUse,
} from "#publishing/application/idempotency-keys.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { idempotencyKeys } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const encoder = new TextEncoder();

/**
 * Idempotency keys in the publishing schema, each under the SHA-256 of the
 * key, with the SHA-256 of the request it came with.
 */
export const DrizzleIdempotencyKeys = Layer.effect(
  IdempotencyKeys,
  Effect.gen(function* DrizzleIdempotencyKeys() {
    const db = yield* Drizzle;
    const digest = yield* Digest.Digest;

    const hashOf = (text: string) =>
      digest
        .digestHex(Digest.sha256, encoder.encode(text))
        .pipe(Effect.mapError(failed));

    const digestsOf = ({ fingerprint, key }: KeyedRequest) =>
      Effect.all({
        keyDigest: hashOf(key),
        requestDigest: hashOf(fingerprint),
      });

    // What the key was used for after `since`, compared with this request.
    const useOf = (
      workspaceId: WorkspaceId,
      digests: { readonly keyDigest: string; readonly requestDigest: string },
      since: DateTime.Utc
    ) =>
      db
        .select({
          postId: idempotencyKeys.postId,
          requestDigest: idempotencyKeys.requestDigest,
        })
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.workspaceId, workspaceId),
            eq(idempotencyKeys.keyDigest, digests.keyDigest),
            gt(idempotencyKeys.createdAt, date(since))
          )
        )
        .limit(1)
        .pipe(
          Effect.mapError(failed),
          Effect.map(([row]) =>
            Option.fromUndefinedOr(row).pipe(
              Option.map((used): KeyUse => ({
                postId: PostIdSchema.make(used.postId),
                sameRequest: used.requestDigest === digests.requestDigest,
              }))
            )
          )
        );

    return IdempotencyKeys.of({
      claim: (workspaceId, request, use, since) =>
        Effect.gen(function* claim() {
          const digests = yield* digestsOf(request);

          // The key's row, written unless one newer than `since` holds it.
          // A row another transaction is writing is waited for here.
          const written = yield* db
            .insert(idempotencyKeys)
            .values({
              createdAt: date(use.at),
              keyDigest: digests.keyDigest,
              postId: use.postId,
              requestDigest: digests.requestDigest,
              workspaceId,
            })
            .onConflictDoUpdate({
              set: {
                createdAt: date(use.at),
                postId: use.postId,
                requestDigest: digests.requestDigest,
              },
              setWhere: lte(idempotencyKeys.createdAt, date(since)),
              target: [idempotencyKeys.workspaceId, idempotencyKeys.keyDigest],
            })
            .returning({ postId: idempotencyKeys.postId })
            .pipe(Effect.mapError(failed));

          return written.length > 0
            ? Option.none<KeyUse>()
            : yield* useOf(workspaceId, digests, since);
        }),
      find: (workspaceId, request, since) =>
        digestsOf(request).pipe(
          Effect.flatMap((digests) => useOf(workspaceId, digests, since))
        ),
      purge: (before) =>
        db
          .delete(idempotencyKeys)
          .where(lte(idempotencyKeys.createdAt, date(before)))
          .returning({ postId: idempotencyKeys.postId })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length)
          ),
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
