import { DateTime, Effect, Layer, Metric, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PaidReads } from "#analytics/application/paid-reads.ts";
import type {
  PaidReadClaim,
  PaidReadRelease,
  PaidReadsCovered,
} from "#analytics/application/paid-reads.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { XPassThrough } from "#billing/application/x-pass-through.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";

import { paidReadsCounted, SqlPaidReads } from "./sql-paid-reads.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeResources = Schema.decodeUnknownEffect(Schema.Array(Schema.String));

// The resources of the day already read, then those taken now.
const readToday = (
  sql: SqlClient.SqlClient,
  claim: PaidReadClaim,
  day: string
) =>
  sql<{ readonly resource: string }>`
    SELECT resource FROM analytics.paid_reads
    WHERE workspace_id = ${claim.workspaceId}
      AND platform = ${claim.platform}
      AND day = ${day}::date
  `.pipe(
    Effect.map((rows) => rows.map(({ resource }) => resource)),
    Effect.flatMap(decodeResources),
    Effect.orDie
  );

/**
 * PaidReads on a server that bills, where X's reads are passed through at
 * X's rates: a workspace reads nothing unless it turned its X reads on
 * (`XPassThrough`); then each resource first read in a UTC day claims its rate
 * on the billing account's `xApi` meter (a user `userRead`, a post
 * `postRead`), and is kept, so it is not claimed again that day, as X
 * bills it once. The resources the meter has no room for (its ceiling, or
 * no payment method) are left unread, as a spent allowance leaves them
 * today. Under the same advisory lock as the daily allowance, in one
 * transaction with the claim: claims made together never pass the meter.
 */
export const billedPaidReads = Layer.effect(
  PaidReads,
  Effect.gen(function* BilledPaidReads() {
    const sql = yield* SqlClient.SqlClient;
    const xPassThrough = yield* XPassThrough;
    const meters = yield* MeteredUsage;

    // What a resource costs on the meter: an account's read, or a post's.
    const unitsOf = (resource: string) =>
      resource.startsWith("user:")
        ? xPassThrough.rates.userRead
        : xPassThrough.rates.postRead;

    // The lock of a workspace's reads on a platform, which claims and
    // releases take in turn, as the daily allowance's does.
    const lockOf = (workspaceId: string, platform: string) =>
      sql`SELECT pg_advisory_xact_lock(hashtext('peal-server/analytics/paid-reads'), hashtext(${`${workspaceId}/${platform}`}))`.pipe(
        Effect.orDie
      );

    const claimLocked = Effect.fn("PaidReads.claimBilled")(
      function* claimLocked(claim: PaidReadClaim, day: string) {
        const { platform, workspaceId } = claim;

        yield* lockOf(workspaceId, platform);

        const had = new Set(yield* readToday(sql, claim, day));

        const fresh = [...new Set(claim.resources)].filter(
          (resource) => !had.has(resource)
        );

        // The new resources the meter has room for, in the order asked.
        const state = yield* meters.state(workspaceId, "xApi");

        const room = state.pipe(
          Option.flatMap(({ allowed, used }) =>
            allowed.pipe(Option.map((most) => most - used))
          )
        );

        const affordable: string[] = [];
        let spent = 0;

        for (const resource of fresh) {
          const cost = unitsOf(resource);

          if (Option.isSome(room) && spent + cost > room.value) {
            break;
          }

          affordable.push(resource);
          spent += cost;
        }

        let total = 0;

        for (const resource of fresh) {
          total += unitsOf(resource);
        }

        // Claimed together. Where they do not all fit, the whole is asked
        // first, so its refusal tells the billing managers the ceiling is
        // reached (reads that stop short of it would never be refused),
        // then what fits; refused again (another claim took the room
        // first), nothing new is read.
        const claimed = (resources: readonly string[], units: number) =>
          resources.length === 0
            ? Effect.succeed<readonly string[]>([])
            : meters.claim(workspaceId, "xApi", units).pipe(
                Effect.as(resources),
                Effect.catchTag("AllowanceReached", () =>
                  Effect.succeed<readonly string[]>([])
                )
              );

        const taken =
          affordable.length < fresh.length
            ? yield* claimed(fresh, total).pipe(
                Effect.flatMap((all) =>
                  all.length > 0
                    ? Effect.succeed(all)
                    : claimed(affordable, spent)
                )
              )
            : yield* claimed(affordable, spent);

        if (taken.length > 0) {
          yield* sql`
            INSERT INTO analytics.paid_reads (workspace_id, platform, day, resource)
            SELECT ${workspaceId}, ${platform}, ${day}::date, taken.resource
            FROM unnest(string_to_array(${taken.join(",")}, ',')) AS taken(resource)
          `.pipe(Effect.orDie);
        }

        return { had, taken };
      }
    );

    const claim = Effect.fn("PaidReads.claim")(function* claim(
      asked: PaidReadClaim
    ) {
      const at = yield* DateTime.now;
      const none: PaidReadsCovered = { at, fresh: [], resources: [] };

      if (asked.resources.length === 0) {
        return none;
      }

      // A workspace that did not turn its reads on reads nothing.
      if (!(yield* xPassThrough.readsOn(asked.workspaceId))) {
        return none;
      }

      const day = DateTime.formatIsoDateUtc(at);

      const { had, taken } = yield* sql
        .withTransaction(claimLocked(asked, day))
        .pipe(
          Effect.catchTag("SqlError", (cause) => Effect.fail(failed(cause)))
        );

      yield* Metric.update(
        Metric.withAttributes(paidReadsCounted, { platform: asked.platform }),
        taken.length
      );

      const allowed = new Set([...had, ...taken]);

      const covered: PaidReadsCovered = {
        at,
        fresh: taken,
        resources: asked.resources.filter((resource) => allowed.has(resource)),
      };

      return covered;
    });

    // The resources X did not return are neither billed by X nor read:
    // their rows of the claim's day go, and their units back in the
    // claim's month, in one transaction, under the lock claims take, so a
    // claim that found the row today (and whose read X answers) is never
    // left billed by X and by nobody.
    const releaseLocked = Effect.fn("PaidReads.releaseBilled")(
      function* releaseLocked(released: PaidReadRelease, day: string) {
        const { platform, workspaceId } = released;

        yield* lockOf(workspaceId, platform);

        const rows = yield* sql<{ readonly resource: string }>`
          DELETE FROM analytics.paid_reads
          WHERE workspace_id = ${workspaceId}
            AND platform = ${platform}
            AND day = ${day}::date
            AND resource = ANY(string_to_array(${released.resources.join(",")}, ','))
          RETURNING resource
        `.pipe(Effect.orDie);

        let units = 0;

        for (const { resource } of rows) {
          units += unitsOf(resource);
        }

        if (units > 0) {
          yield* meters.giveBack({
            at: released.at,
            meter: "xApi",
            units,
            workspaceId,
          });
        }
      }
    );

    const release = Effect.fn("PaidReads.release")(function* release(
      released: PaidReadRelease
    ) {
      if (released.resources.length === 0) {
        return;
      }

      const day = DateTime.formatIsoDateUtc(released.at);

      yield* sql
        .withTransaction(releaseLocked(released, day))
        .pipe(
          Effect.catchTag("SqlError", (cause) => Effect.fail(failed(cause)))
        );
    });

    return PaidReads.of({
      claim,
      reads: (workspaceId) => xPassThrough.readsOn(workspaceId),
      release,
    });
  })
);

/**
 * X's reads: on a server that bills, passed through at X's rates for the
 * workspaces that turned them on (`billedPaidReads`); elsewhere, the
 * operator's daily allowance a workspace (`SqlPaidReads`). Chosen once.
 */
export const PaidReadsLive = Layer.unwrap(
  BillingMode.use(({ enabled }) =>
    Effect.succeed(enabled ? billedPaidReads : SqlPaidReads)
  )
);
