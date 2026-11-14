import { DateTime, Effect, Layer, Metric, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PaidReads } from "#analytics/application/paid-reads.ts";
import type {
  PaidReadClaim,
  PaidReadsCovered,
} from "#analytics/application/paid-reads.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

import { xDailyReadsConfig } from "./x-daily-reads.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeResources = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({ fresh: Schema.Boolean, resource: Schema.String })
  )
);

/**
 * The resources read on platforms that bill each read, counted when they
 * are first read in a UTC day: what the operator is billed for, by
 * platform.
 */
export const paidReadsCounted = Metric.counter("peal.analytics.paid_reads", {
  description:
    "Resources read on a platform that bills each read, counted once a UTC day",
  incremental: true,
});

/**
 * PaidReads in Postgres, with `allowance` resources a workspace, a
 * platform and a UTC day. A claim runs in one transaction, under an
 * advisory lock on the workspace and the platform, so claims made together
 * never pass the allowance between them.
 */
export const sqlPaidReadsWith = (allowance: number) =>
  Layer.effect(
    PaidReads,
    Effect.gen(function* SqlPaidReads() {
      const sql = yield* SqlClient.SqlClient;

      const claimLocked = Effect.fn("PaidReads.claimLocked")(
        function* claimLocked(claim: PaidReadClaim, day: string) {
          const { platform, workspaceId } = claim;

          yield* sql`SELECT pg_advisory_xact_lock(hashtext('peal-server/analytics/paid-reads'), hashtext(${`${workspaceId}/${platform}`}))`;

          // The resources asked, in order: those read today already, then
          // the new ones the day's allowance still covers, which are kept.
          const rows = yield* sql`
            WITH asked AS (
              SELECT resource, min(position) AS position
              FROM unnest(string_to_array(${claim.resources.join(",")}, ','))
                WITH ORDINALITY AS listed(resource, position)
              GROUP BY resource
            ), had AS (
              SELECT resource FROM analytics.paid_reads
              WHERE workspace_id = ${workspaceId}
                AND platform = ${platform}
                AND day = ${day}::date
            ), fresh AS (
              SELECT asked.resource,
                     row_number() OVER (ORDER BY asked.position) AS turn
              FROM asked
              WHERE asked.resource NOT IN (SELECT resource FROM had)
            ), taken AS (
              INSERT INTO analytics.paid_reads
                (workspace_id, platform, day, resource)
              SELECT ${workspaceId}, ${platform}, ${day}::date, fresh.resource
              FROM fresh
              WHERE fresh.turn <= ${allowance} - (SELECT count(*) FROM had)
              RETURNING resource
            )
            SELECT resource, true AS fresh FROM taken
            UNION ALL
            SELECT asked.resource, false AS fresh
            FROM asked JOIN had ON had.resource = asked.resource
          `;

          return yield* decodeResources(rows).pipe(Effect.orDie);
        }
      );

      const claim = Effect.fn("PaidReads.claim")(function* claim(
        asked: PaidReadClaim
      ) {
        if (asked.resources.length === 0) {
          const none: PaidReadsCovered = {
            at: yield* DateTime.now,
            fresh: [],
            resources: [],
          };

          return none;
        }

        const at = yield* DateTime.now;
        const day = DateTime.formatIsoDateUtc(at);

        const covered = yield* sql
          .withTransaction(claimLocked(asked, day))
          .pipe(Effect.mapError(failed));

        yield* Metric.update(
          Metric.withAttributes(paidReadsCounted, { platform: asked.platform }),
          covered.filter(({ fresh }) => fresh).length
        );

        const allowed = new Set(covered.map(({ resource }) => resource));

        const result: PaidReadsCovered = {
          at,
          fresh: covered
            .filter(({ fresh }) => fresh)
            .map(({ resource }) => resource),
          resources: asked.resources.filter((resource) =>
            allowed.has(resource)
          ),
        };

        return result;
      });

      // The operator's daily allowance counts what was asked, returned or
      // not, as it always did; every workspace reads.
      return PaidReads.of({
        claim,
        reads: () => Effect.succeed(true),
        release: () => Effect.void,
      });
    })
  );

/** PaidReads with the allowance the server is set to. */
export const SqlPaidReads = Layer.unwrap(
  xDailyReadsConfig.pipe(Effect.map(sqlPaidReadsWith))
);
