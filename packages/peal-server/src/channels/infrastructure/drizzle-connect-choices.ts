import { and, eq, lte } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { Digest } from "effect/crypto";

import { ConnectChoices } from "#channels/application/connect-choices.ts";
import type { StoredChoice } from "#channels/application/connect-choices.ts";
import { EncryptedTokenSchema } from "#channels/application/token-cipher.ts";
import { ConnectChoice } from "#channels/domain/connect-choice.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { connectChoices } from "./schema.ts";
import { storedConnection } from "./stored-connection.ts";

type Row = typeof connectChoices.$inferSelect;

const decodeChoice = Schema.decodeUnknownEffect(ConnectChoice);

const decodeAccounts = Schema.decodeUnknownEffect(EncryptedTokenSchema);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const encoder = new TextEncoder();

// The selection comes from the member's browser, since only its hash is
// stored.
const toStored = (row: Row, selection: string) =>
  Effect.all({
    accounts: decodeAccounts(row.accounts),
    choice: decodeChoice({
      connection: storedConnection(row.platform, row.connection),
      createdAt: DateTime.fromDateUnsafe(row.createdAt),
      expiresAt: DateTime.fromDateUnsafe(row.expiresAt),
      grantedBy: Option.fromNullOr(row.grantedBy),
      platform: row.platform,
      selection,
      startedBy: row.startedBy,
      workspaceId: row.workspaceId,
    }),
  }).pipe(Effect.orDie);

/** Choices offered to members, keyed by their selection's hash. */
export const DrizzleConnectChoices = Layer.effect(
  ConnectChoices,
  Effect.gen(function* DrizzleConnectChoices() {
    const db = yield* Drizzle;
    const digest = yield* Digest.Digest;

    const hashOf = (selection: string) =>
      digest.digestHex(Digest.sha256, encoder.encode(selection));

    return ConnectChoices.of({
      purgeExpired: (now) =>
        db
          .delete(connectChoices)
          .where(lte(connectChoices.expiresAt, date(now)))
          .returning({ selectionHash: connectChoices.selectionHash })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length)
          ),
      save: (choice, accounts) =>
        hashOf(choice.selection).pipe(
          Effect.flatMap((selectionHash) =>
            db.insert(connectChoices).values({
              accounts,
              connection: Option.getOrNull(choice.connection),
              createdAt: date(choice.createdAt),
              expiresAt: date(choice.expiresAt),
              grantedBy: Option.getOrNull(choice.grantedBy),
              platform: choice.platform,
              selectionHash,
              startedBy: choice.startedBy,
              workspaceId: choice.workspaceId,
            })
          ),
          Effect.mapError(failed),
          Effect.asVoid
        ),
      take: (selection, { platform, startedBy, workspaceId }) =>
        hashOf(selection).pipe(
          Effect.flatMap((selectionHash) =>
            db
              .delete(connectChoices)
              .where(
                and(
                  eq(connectChoices.selectionHash, selectionHash),
                  eq(connectChoices.platform, platform),
                  eq(connectChoices.startedBy, startedBy),
                  eq(connectChoices.workspaceId, workspaceId)
                )
              )
              .returning()
          ),
          Effect.mapError(failed),
          Effect.flatMap(([row]) =>
            row === undefined
              ? Effect.succeed(Option.none<StoredChoice>())
              : toStored(row, selection).pipe(Effect.map(Option.some))
          )
        ),
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
