// Whose workspaces are, a set at a time: the set forms of the partner
// reads answer, for each workspace of a list, what the single forms
// answer for it, in one statement each, and an empty list asks nothing.
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { newId } from "#shared/application/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { statementsOf } from "#test/shared/support.ts";
import { CustomerWorkspaces } from "#workspace/application/customer-workspaces.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";
import { PartnerStore } from "#workspace/application/partner-store.ts";
import { PartnerIdSchema } from "#workspace/domain/partner-id.ts";
import type { PartnerId } from "#workspace/domain/partner-id.ts";
import { DrizzleCustomerWorkspaces } from "#workspace/infrastructure/drizzle-customer-workspaces.ts";
import { DrizzlePartnerStore } from "#workspace/infrastructure/drizzle-partner-store.ts";

const PoolsTest = PartnerOwnership.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(DrizzlePartnerStore, DrizzleCustomerWorkspaces)
  ),
  Layer.provideMerge(DatabaseTest)
);

const at = DateTime.toDateUtc(DateTime.makeUnsafe("2026-11-01T00:00:00Z"));

// A partner account of `home`, owning `owned`, as the workspace context
// keeps them: the reads name no workspace row, so none is written.
const partnerOf = Effect.fn("partnerOf")(function* partnerOf(
  home: WorkspaceId,
  owned: readonly WorkspaceId[]
) {
  const sql = yield* SqlClient.SqlClient;
  const id = yield* newId(PartnerIdSchema);

  yield* sql`INSERT INTO workspace.partners (id, workspace_id, name, return_origins, created_at, updated_at) VALUES (${id}, ${home}, ${"Synthetic Suite"}, ${"{}"}, ${at}, ${at})`;

  for (const [index, workspaceId] of owned.entries()) {
    yield* sql`INSERT INTO workspace.partner_workspaces (workspace_id, partner_id, external_id, created_at) VALUES (${workspaceId}, ${id}, ${`synthetic-${String(index)}`}, ${at})`;
  }

  return id;
});

const fresh = (count: number) =>
  Effect.all(Array.from({ length: count }, () => freshWorkspace));

// Two partners, a workspace of neither, and the ids listed in an order of
// their own.
const partnered = Effect.gen(function* partnered() {
  const [home, other, alone] = yield* fresh(3);
  const owned = yield* fresh(3);
  const otherOwned = yield* fresh(1);

  if (home === undefined || other === undefined || alone === undefined) {
    return yield* Effect.die("Workspaces were not made");
  }

  const partner = yield* partnerOf(home, owned);
  const otherPartner = yield* partnerOf(other, otherOwned);

  return {
    alone,
    home,
    ids: [alone, ...owned.slice(0, 2), other, home, ...otherOwned],
    otherPartner,
    owned,
    partner,
  };
});

const cleanUp = (partners: readonly PartnerId[]) =>
  SqlClient.SqlClient.use((sql) =>
    Effect.all([
      sql`DELETE FROM workspace.partner_workspaces WHERE partner_id IN ${sql.in(partners)}`,
      sql`DELETE FROM workspace.partners WHERE id IN ${sql.in(partners)}`,
    ])
  );

layer(PoolsTest)("whose workspaces are, a set at a time", (it) => {
  it.effect("answer each workspace what the single reads answer for it", () =>
    Effect.gen(function* sameAnswers() {
      const ownership = yield* PartnerOwnership;
      const store = yield* PartnerStore;
      const customers = yield* CustomerWorkspaces;
      const made = yield* partnered;

      yield* Effect.gen(function* reads() {
        const owners = yield* ownership.ownersIn(made.ids);
        const pools = yield* ownership.poolsIn(made.ids);
        const homes = yield* store.ofWorkspaces(made.ids);

        const owned = yield* customers.idsOfEach([
          made.partner,
          made.otherPartner,
        ]);

        for (const workspaceId of made.ids) {
          assert.deepStrictEqual(
            Option.fromUndefinedOr(owners.get(workspaceId)),
            yield* ownership.ownerOf(workspaceId)
          );
          assert.deepStrictEqual(
            Option.fromUndefinedOr(homes.get(workspaceId)),
            yield* store.ofWorkspace(workspaceId)
          );

          const pool = Option.fromUndefinedOr(pools.get(workspaceId));
          const single = yield* ownership.poolOf(workspaceId);

          assert.deepStrictEqual(
            pool.pipe(
              Option.map(({ holder, others }) => ({
                holder,
                others: others.toSorted(),
              }))
            ),
            single.pipe(
              Option.map(({ holder, others }) => ({
                holder,
                others: others.toSorted(),
              }))
            )
          );
        }

        for (const partnerId of [made.partner, made.otherPartner]) {
          assert.deepStrictEqual(
            (owned.get(partnerId) ?? []).toSorted(),
            (yield* customers.idsOf(partnerId)).toSorted()
          );
        }

        assert.isFalse(owners.has(made.alone));
        assert.isFalse(pools.has(made.alone));
        assert.isTrue(pools.has(made.home));
      }).pipe(
        Effect.ensuring(
          Effect.orDie(cleanUp([made.partner, made.otherPartner]))
        )
      );
    })
  );

  it.effect(
    "read in one statement each, a pool's members once whatever their number, and ask nothing of no workspace",
    () =>
      Effect.gen(function* bounded() {
        const ownership = yield* PartnerOwnership;
        const store = yield* PartnerStore;
        const customers = yield* CustomerWorkspaces;
        const made = yield* partnered;

        yield* Effect.gen(function* reads() {
          const owners = yield* statementsOf(ownership.ownersIn(made.ids));
          const homes = yield* statementsOf(store.ofWorkspaces(made.ids));

          const owned = yield* statementsOf(
            customers.idsOfEach([made.partner, made.otherPartner])
          );

          const pools = yield* statementsOf(ownership.poolsIn(made.ids));

          assert.deepStrictEqual(
            [owners, homes, owned].map(({ statements }) => statements),
            [1, 1, 1]
          );
          assert.strictEqual(pools.statements, 3);

          const none = yield* statementsOf(
            Effect.all([
              ownership.ownersIn([]),
              ownership.poolsIn([]),
              store.ofWorkspaces([]),
              customers.idsOfEach([]),
            ])
          );

          assert.strictEqual(none.statements, 0);
          assert.deepStrictEqual(
            none.result.map(({ size }) => size),
            [0, 0, 0, 0]
          );

          // A list of workspaces no partner has asks no partner's members.
          const lone = yield* statementsOf(ownership.poolsIn([made.alone]));

          assert.strictEqual(lone.statements, 2);
          assert.strictEqual(lone.result.size, 0);
        }).pipe(
          Effect.ensuring(
            Effect.orDie(cleanUp([made.partner, made.otherPartner]))
          )
        );
      })
  );
});
