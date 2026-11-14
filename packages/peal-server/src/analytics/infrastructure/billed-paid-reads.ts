import { DateTime, Effect, Layer, Metric, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PaidReads } from "#analytics/application/paid-reads.ts";
import type { PaidReadClaim } from "#analytics/application/paid-reads.ts";
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

    const claimLocked = Effect.fn("PaidReads.claimBilled")(
      function* claimLocked(claim: PaidReadClaim, day: string) {
        const { platform, workspaceId } = claim;

        yield* sql`SELECT pg_advisory_xact_lock(hashtext('peal-server/analytics/paid-reads'), hashtext(${`${workspaceId}/${platform}`}))`.pipe(
          Effect.orDie
        );

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

        // Claimed together; refused (another claim took the room first),
        // nothing new is read.
        const taken =
          affordable.length === 0
            ? []
            : yield* meters.claim(workspaceId, "xApi", spent).pipe(
                Effect.as(affordable),
                Effect.catchTag("AllowanceReached", () =>
                  Effect.succeed<string[]>([])
                )
              );

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
      if (asked.resources.length === 0) {
        return [];
      }

      // A workspace that did not turn its reads on reads nothing.
      if (!(yield* xPassThrough.readsOn(asked.workspaceId))) {
        return [];
      }

      const day = DateTime.formatIsoDateUtc(yield* DateTime.now);

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

      return asked.resources.filter((resource) => allowed.has(resource));
    });

    return PaidReads.of({ claim });
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
