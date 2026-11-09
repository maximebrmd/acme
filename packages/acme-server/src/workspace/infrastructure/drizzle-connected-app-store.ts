import { and, eq, inArray } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Order, Schema } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { ConnectedAppStore } from "#workspace/application/connected-app-store.ts";
import type { ConnectedAppRecord } from "#workspace/application/connected-app-store.ts";

import {
  oauthAccessToken,
  oauthClient,
  oauthConsent,
  oauthRefreshToken,
  organization,
} from "./auth-schema.generated.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const isUuid = Schema.is(Schema.String.check(Schema.isUUID()));

// What a consent or a refresh token says about a client's access.
interface Grant {
  readonly clientId: string;
  readonly createdAt: Date | null;
  readonly live: boolean;
  readonly referenceId: string | null;
  readonly refreshed: boolean;
  readonly scopes: readonly string[];
}

const byNewest = Order.mapInput(
  Order.flip(DateTime.Order),
  (app: ConnectedAppRecord) => app.authorizedAt
);

// Dates in time order, the earliest first.
const chronological = (dates: readonly Date[]): readonly Date[] =>
  dates.toSorted((left, right) => left.getTime() - right.getTime());

const earliest = (dates: readonly Date[]): Date | undefined =>
  chronological(dates)[0];

const latest = (dates: readonly Date[]): Date | undefined =>
  chronological(dates).at(-1);

/**
 * ConnectedAppStore on the OAuth provider's tables. Better Auth revokes one
 * token at a time, by its value, which it keeps only hashed: withdrawing a
 * client deletes its consents and the user's tokens for it here. A token
 * deleted, then presented, reads as unknown, as a revoked one does.
 */
export const DrizzleConnectedAppStore = Layer.effect(
  ConnectedAppStore,
  Effect.gen(function* DrizzleConnectedAppStore() {
    const db = yield* Drizzle;

    const list = Effect.fn("ConnectedAppStore.list")(function* list(
      userId: UserId,
      now: DateTime.Utc
    ) {
      const consents = yield* db
        .select({
          clientId: oauthConsent.clientId,
          createdAt: oauthConsent.createdAt,
          referenceId: oauthConsent.referenceId,
          scopes: oauthConsent.scopes,
        })
        .from(oauthConsent)
        .where(eq(oauthConsent.userId, userId))
        .pipe(Effect.mapError(failed));

      const tokens = yield* db
        .select({
          clientId: oauthRefreshToken.clientId,
          createdAt: oauthRefreshToken.createdAt,
          expiresAt: oauthRefreshToken.expiresAt,
          referenceId: oauthRefreshToken.referenceId,
          revoked: oauthRefreshToken.revoked,
          scopes: oauthRefreshToken.scopes,
        })
        .from(oauthRefreshToken)
        .where(eq(oauthRefreshToken.userId, userId))
        .pipe(Effect.mapError(failed));

      const instant = DateTime.toDateUtc(now).getTime();

      const grants: readonly Grant[] = [
        ...consents.map((consent) => ({
          ...consent,
          live: true,
          refreshed: false,
        })),
        // Rotated tokens stay, revoked: they tell when access was first
        // given, but only one still valid keeps a client signed in.
        ...tokens.map((token) => ({
          clientId: token.clientId,
          createdAt: token.createdAt,
          live:
            token.revoked === null &&
            (token.expiresAt === null || token.expiresAt.getTime() > instant),
          referenceId: token.referenceId,
          refreshed: true,
          scopes: token.scopes,
        })),
      ];

      const clientIds = [
        ...new Set(
          grants.flatMap(({ clientId, live }) => (live ? [clientId] : []))
        ),
      ];

      if (clientIds.length === 0) {
        return [];
      }

      const clients = yield* db
        .select({
          clientId: oauthClient.clientId,
          name: oauthClient.name,
          uri: oauthClient.uri,
        })
        .from(oauthClient)
        .where(inArray(oauthClient.clientId, clientIds))
        .pipe(Effect.mapError(failed));

      const workspaceIds = [
        ...new Set(
          grants.flatMap(({ referenceId }) =>
            referenceId !== null && isUuid(referenceId) ? [referenceId] : []
          )
        ),
      ];

      const workspaces =
        workspaceIds.length === 0
          ? []
          : yield* db
              .select({ id: organization.id, name: organization.name })
              .from(organization)
              .where(inArray(organization.id, workspaceIds))
              .pipe(Effect.mapError(failed));

      const nameOf = new Map(workspaces.map(({ id, name }) => [id, name]));

      const apps = clientIds.map((clientId): ConnectedAppRecord => {
        const own = grants.filter((grant) => grant.clientId === clientId);
        const client = clients.find((found) => found.clientId === clientId);
        const dated = own.flatMap(({ createdAt }) => createdAt ?? []);

        const renewed = latest(
          own.flatMap(({ createdAt, refreshed }) =>
            refreshed && createdAt !== null ? [createdAt] : []
          )
        );

        const live = own.filter((grant) => grant.live);

        const referenceIds = [
          ...new Set(live.flatMap(({ referenceId }) => referenceId ?? [])),
        ];

        return {
          authorizedAt: Option.match(Option.fromUndefinedOr(earliest(dated)), {
            onNone: () => now,
            onSome: (date) => DateTime.fromDateUnsafe(date),
          }),
          clientId,
          lastUsedAt:
            renewed === undefined ? null : DateTime.fromDateUnsafe(renewed),
          name: client?.name ?? null,
          scopes: [...new Set(live.flatMap(({ scopes }) => scopes))].toSorted(),
          uri: client?.uri ?? null,
          workspaces: referenceIds.map((id) => ({
            id,
            name: nameOf.get(id) ?? null,
          })),
        };
      });

      return apps.toSorted(byNewest);
    });

    const revoke = Effect.fn("ConnectedAppStore.revoke")(function* revoke(
      userId: UserId,
      clientId: string,
      now: DateTime.Utc
    ) {
      const theirs = (
        table:
          | typeof oauthAccessToken
          | typeof oauthConsent
          | typeof oauthRefreshToken
      ) => and(eq(table.userId, userId), eq(table.clientId, clientId));

      const known = yield* list(userId, now);

      // Access tokens kept in the database go first: some reference the
      // refresh token they were issued with.
      yield* db
        .delete(oauthAccessToken)
        .where(theirs(oauthAccessToken))
        .pipe(Effect.mapError(failed));

      yield* db
        .delete(oauthRefreshToken)
        .where(theirs(oauthRefreshToken))
        .pipe(Effect.mapError(failed));

      yield* db
        .delete(oauthConsent)
        .where(theirs(oauthConsent))
        .pipe(Effect.mapError(failed));

      return known.some((app) => app.clientId === clientId);
    });

    return ConnectedAppStore.of({ list, revoke });
  })
);
