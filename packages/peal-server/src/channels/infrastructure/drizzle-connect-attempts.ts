import { and, eq, lte } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { Digest } from "effect/crypto";

import { ConnectAttempts } from "#channels/application/connect-attempts.ts";
import type { StoredAttempt } from "#channels/application/connect-attempts.ts";
import { EncryptedTokenSchema } from "#channels/application/token-cipher.ts";
import { ConnectAttempt } from "#channels/domain/connect-attempt.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { connectAttempts } from "./schema.ts";

type Row = typeof connectAttempts.$inferSelect;

const decodeAttempt = Schema.decodeUnknownEffect(ConnectAttempt);

const decodeSecret = Schema.decodeUnknownEffect(EncryptedTokenSchema);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const encoder = new TextEncoder();

// Rows are decoded with the domain's schema; the state comes from the
// callback, since only its hash is stored.
const toStored = (row: Row, state: string) =>
  Effect.all({
    attempt: decodeAttempt({
      channelId: Option.fromNullOr(row.channelId),
      createdAt: DateTime.fromDateUnsafe(row.createdAt),
      expiresAt: DateTime.fromDateUnsafe(row.expiresAt),
      instance: Option.fromNullOr(row.instance),
      platform: row.platform,
      startedBy: row.startedBy,
      state,
      workspaceId: row.workspaceId,
    }),
    secret: decodeSecret(row.secret),
  }).pipe(Effect.orDie);

/** Connection attempts in the channels schema, keyed by their state's hash. */
export const DrizzleConnectAttempts = Layer.effect(
  ConnectAttempts,
  Effect.gen(function* DrizzleConnectAttempts() {
    const db = yield* Drizzle;
    const digest = yield* Digest.Digest;

    const hashOf = (state: string) =>
      digest.digestHex(Digest.sha256, encoder.encode(state));

    return ConnectAttempts.of({
      purgeExpired: (now) =>
        db
          .delete(connectAttempts)
          .where(lte(connectAttempts.expiresAt, date(now)))
          .returning({ stateHash: connectAttempts.stateHash })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length)
          ),
      save: (attempt, secret) =>
        hashOf(attempt.state).pipe(
          Effect.flatMap((stateHash) =>
            db.insert(connectAttempts).values({
              channelId: Option.getOrNull(attempt.channelId),
              createdAt: date(attempt.createdAt),
              expiresAt: date(attempt.expiresAt),
              instance: Option.getOrNull(attempt.instance),
              platform: attempt.platform,
              secret,
              startedBy: attempt.startedBy,
              stateHash,
              workspaceId: attempt.workspaceId,
            })
          ),
          Effect.mapError(failed),
          Effect.asVoid
        ),
      take: (state, { platform, startedBy, workspaceId }) =>
        hashOf(state).pipe(
          Effect.flatMap((stateHash) =>
            db
              .delete(connectAttempts)
              .where(
                and(
                  eq(connectAttempts.stateHash, stateHash),
                  eq(connectAttempts.platform, platform),
                  eq(connectAttempts.startedBy, startedBy),
                  eq(connectAttempts.workspaceId, workspaceId)
                )
              )
              .returning()
          ),
          Effect.mapError(failed),
          Effect.flatMap(([row]) =>
            row === undefined
              ? Effect.succeed(Option.none<StoredAttempt>())
              : toStored(row, state).pipe(Effect.map(Option.some))
          )
        ),
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
