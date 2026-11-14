import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { AdRecords } from "#ads/application/ad-records.ts";
import { BoostsRunning } from "#ads/application/boosts-running.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { failed, utc } from "./rows.ts";
import {
  accounts,
  adSets,
  ads,
  auditEvents,
  boosts,
  campaigns,
  grants,
  activeAdMonths,
  insightDays,
  signInAttempts,
  spendCalls,
} from "./schema.ts";
import { lockWorkspaceSpending } from "./spending-locks.ts";

/** AdRecords on the ads schema. */
export const DrizzleAdRecords = Layer.effect(
  AdRecords,
  Effect.gen(function* DrizzleAdRecords() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return AdRecords.of({
      ensureErasable: Effect.fn("AdRecords.ensureErasable")(
        function* ensureErasable(workspaceId) {
          // In the erasure's transaction, after any boost being asked for
          // or checked before it runs: one asked for after it finds no
          // account.
          yield* lockWorkspaceSpending(client, workspaceId);

          const [open] = yield* db
            .select({ count: sql<number>`count(*)::int` })
            .from(boosts)
            .where(
              and(
                eq(boosts.workspaceId, workspaceId),
                inArray(boosts.state, ["requested", "active", "unconfirmed"])
              )
            )
            .pipe(Effect.mapError(failed));

          const count = open?.count ?? 0;

          yield* count > 0
            ? Effect.fail(new BoostsRunning({ boosts: count, workspaceId }))
            : Effect.void;
        }
      ),
      eraseWorkspace: Effect.fn("AdRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId) {
          // Each table by its workspace, the journal and the boosts
          // before the accounts they are of, then the sign-ins and their
          // encrypted tokens.
          for (const table of [
            spendCalls,
            boosts,
            insightDays,
            activeAdMonths,
            ads,
            adSets,
            campaigns,
            accounts,
            grants,
            signInAttempts,
            auditEvents,
          ] as const) {
            yield* db
              .delete(table)
              .where(eq(table.workspaceId, workspaceId))
              .pipe(Effect.mapError(failed));
          }
        }
      ),
      exportWorkspace: Effect.fn("AdRecords.exportWorkspace")(
        function* exportWorkspace(workspaceId) {
          const held = yield* db
            .select()
            .from(accounts)
            .where(eq(accounts.workspaceId, workspaceId))
            .orderBy(asc(accounts.id))
            .pipe(Effect.mapError(failed));

          const signIns = yield* db
            .select({
              createdAt: grants.createdAt,
              id: grants.id,
              network: grants.network,
              scopes: grants.scopes,
            })
            .from(grants)
            .where(eq(grants.workspaceId, workspaceId))
            .orderBy(asc(grants.id))
            .pipe(Effect.mapError(failed));

          const asked = yield* db
            .select()
            .from(boosts)
            .where(eq(boosts.workspaceId, workspaceId))
            .orderBy(asc(boosts.id))
            .pipe(Effect.mapError(failed));

          const trail = yield* db
            .select()
            .from(auditEvents)
            .where(eq(auditEvents.workspaceId, workspaceId))
            .orderBy(asc(auditEvents.id))
            .pipe(Effect.mapError(failed));

          return {
            accounts: held.map((account) => ({
              connectedAt: utc(account.connectedAt),
              currency: account.currency,
              externalId: account.externalId,
              id: account.id,
              monthlyCeiling: account.monthlyCeiling,
              name: account.name,
              network: account.network,
              spendingEnabled: account.spendingEnabled,
              timeZone: account.timeZone,
            })),
            audit: trail.map((entry) => ({
              accountId: entry.accountId,
              action: entry.action,
              amounts: entry.amounts,
              at: utc(entry.at),
              boostId: entry.boostId,
              currency: entry.currency,
            })),
            boosts: asked.map((boost) => ({
              accountId: boost.accountId,
              audience: boost.audience,
              beneficiary: boost.beneficiary,
              budgetAmount: boost.budgetAmount,
              budgetKind: boost.budgetKind,
              committed: boost.committed,
              createdAt: utc(boost.createdAt),
              currency: boost.currency,
              endsAt: utc(boost.endsAt),
              id: boost.id,
              payer: boost.payer,
              postId: boost.postId,
              startsAt: utc(boost.startsAt),
              state: boost.state,
            })),
            connections: signIns.map((grant) => ({
              ...grant,
              createdAt: utc(grant.createdAt),
            })),
          };
        }
      ),
      forgetUser: Effect.fn("AdRecords.forgetUser")(
        function* forgetUser(userId) {
          yield* db
            .delete(signInAttempts)
            .where(eq(signInAttempts.startedBy, userId))
            .pipe(Effect.mapError(failed));
          yield* db
            .update(grants)
            .set({ grantedBy: null })
            .where(eq(grants.grantedBy, userId))
            .pipe(Effect.mapError(failed));
          yield* db
            .update(accounts)
            .set({ connectedBy: null })
            .where(eq(accounts.connectedBy, userId))
            .pipe(Effect.mapError(failed));
          yield* db
            .update(accounts)
            .set({ authorizedBy: null })
            .where(eq(accounts.authorizedBy, userId))
            .pipe(Effect.mapError(failed));
          yield* db
            .update(boosts)
            .set({ requestedByClient: null, requestedById: null })
            .where(
              and(
                eq(boosts.requestedByKind, "user"),
                eq(boosts.requestedById, userId)
              )
            )
            .pipe(Effect.mapError(failed));
          yield* db
            .update(auditEvents)
            .set({ byClient: null, byId: null })
            .where(
              and(eq(auditEvents.byKind, "user"), eq(auditEvents.byId, userId))
            )
            .pipe(Effect.mapError(failed));
        }
      ),
    });
  })
);
