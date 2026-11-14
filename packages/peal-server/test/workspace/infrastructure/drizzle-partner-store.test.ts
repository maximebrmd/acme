import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { newId } from "#shared/application/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { PartnerStore } from "#workspace/application/partner-store.ts";
import { PartnerIdSchema } from "#workspace/domain/partner-id.ts";
import { Partner } from "#workspace/domain/partner.ts";
import { DrizzleCustomerWorkspaces } from "#workspace/infrastructure/drizzle-customer-workspaces.ts";
import { DrizzlePartnerStore } from "#workspace/infrastructure/drizzle-partner-store.ts";

// A partner's daily counts in Postgres: read between two days, and purged
// before one, every partner's at once.

const StoreTest = DrizzlePartnerStore.pipe(
  Layer.provideMerge(DrizzleCustomerWorkspaces),
  Layer.provideMerge(DatabaseTest)
);

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

// A partner account kept as the store keeps one, for a home workspace
// that need not exist: the store reads no workspace for this.
const freshPartner = Effect.gen(function* freshPartner() {
  const sql = yield* SqlClient.SqlClient;
  const id = yield* newId(PartnerIdSchema);
  const workspaceId = yield* freshWorkspace;
  const now = DateTime.toDateUtc(day("2026-11-01"));

  yield* sql`INSERT INTO workspace.partners (id, workspace_id, name, return_origins, created_at, updated_at) VALUES (${id}, ${workspaceId}, ${"Synthetic Suite"}, ${"{}"}, ${now}, ${now})`;

  return new Partner({
    accentColor: Option.none(),
    createdAt: day("2026-11-01"),
    id,
    logoUrl: Option.none(),
    name: "Synthetic Suite",
    returnOrigins: [],
    updatedAt: day("2026-11-01"),
    workspaceId,
  });
});

layer(StoreTest)("a partner's daily counts in Postgres", (it) => {
  it.effect("are read between two days, both included", () =>
    Effect.gen(function* between() {
      const store = yield* PartnerStore;
      const partner = yield* freshPartner;
      const other = yield* freshPartner;

      for (const [index, written] of [
        "2026-10-30",
        "2026-10-31",
        "2026-11-01",
        "2026-11-02",
      ].entries()) {
        yield* store.recordUsage(partner.id, {
          channels: index,
          day: written,
          workspaces: 1,
        });
      }

      yield* store.recordUsage(other.id, {
        channels: 9,
        day: "2026-10-31",
        workspaces: 9,
      });

      assert.deepStrictEqual(
        yield* store.usageBetween(
          partner.id,
          day("2026-10-31"),
          day("2026-11-01")
        ),
        [
          { channels: 1, day: "2026-10-31", workspaces: 1 },
          { channels: 2, day: "2026-11-01", workspaces: 1 },
        ]
      );

      yield* store.closeOf(partner.workspaceId);
      yield* store.closeOf(other.workspaceId);
    })
  );

  it.effect("are purged before a day, every partner's", () =>
    Effect.gen(function* purged() {
      const store = yield* PartnerStore;
      const partner = yield* freshPartner;
      const other = yield* freshPartner;

      // Days no other test writes, long past.
      yield* store.recordUsage(partner.id, {
        channels: 1,
        day: "2024-01-01",
        workspaces: 1,
      });
      yield* store.recordUsage(other.id, {
        channels: 1,
        day: "2024-01-02",
        workspaces: 1,
      });
      yield* store.recordUsage(partner.id, {
        channels: 2,
        day: "2024-01-03",
        workspaces: 1,
      });

      assert.isAtLeast(yield* store.purgeUsageBefore(day("2024-01-03")), 2);

      const everything = { from: day("2023-01-01"), to: day("2024-12-31") };

      assert.deepStrictEqual(
        yield* store.usageBetween(partner.id, everything.from, everything.to),
        [{ channels: 2, day: "2024-01-03", workspaces: 1 }]
      );
      assert.lengthOf(
        yield* store.usageBetween(other.id, everything.from, everything.to),
        0
      );

      yield* store.closeOf(partner.workspaceId);
      yield* store.closeOf(other.workspaceId);
    })
  );
});
