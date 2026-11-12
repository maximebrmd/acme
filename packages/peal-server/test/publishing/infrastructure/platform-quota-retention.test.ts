import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PlatformQuota } from "#publishing/application/platform-quota.ts";
import { DrizzlePlatformQuota } from "#publishing/infrastructure/drizzle-platform-quota.ts";
import { DatabaseTest } from "#test/channels/support.ts";

// The ledger of the platforms' daily quotas keeps the days still counted:
// every bucket is a day's, so past days are deleted, the ledger growing no
// more with a bucket per page or member. Days in 1931, which no other
// suite uses.

const QuotaTest = DrizzlePlatformQuota.pipe(Layer.provideMerge(DatabaseTest));

const CountSchema = Schema.Struct({ count: Schema.Number });

const daysOf = (bucket: string) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`SELECT count(*)::int AS count FROM publishing.quota_usage WHERE bucket = ${bucket}`
  ).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(CountSchema))),
    Effect.map(([row]) => row?.count ?? 0),
    Effect.orDie
  );

layer(QuotaTest)("the quota ledger's retention", (it) => {
  it.effect("deletes the days before the one given, and keeps the others", () =>
    Effect.gen(function* retention() {
      const quota = yield* PlatformQuota;
      const bucket = "test:retention:1931";

      for (const day of [1, 2, 9, 10]) {
        yield* quota.spend({
          allowance: 10,
          bucket,
          day: { day, month: 3, year: 1931 },
          units: 1,
        });
      }

      yield* quota.purge({ day: 9, month: 3, year: 1931 });

      assert.strictEqual(yield* daysOf(bucket), 2);

      yield* SqlClient.SqlClient.use(
        (sql) =>
          sql`DELETE FROM publishing.quota_usage WHERE bucket = ${bucket}`
      ).pipe(Effect.orDie);
    })
  );
});
