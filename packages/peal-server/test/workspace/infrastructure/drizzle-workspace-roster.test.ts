import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import { WorkspaceRoster } from "#workspace/application/workspace-roster.ts";
import { WorkspaceRosterLive } from "#workspace/infrastructure/drizzle-workspace-roster.ts";

const RosterTest = WorkspaceRosterLive.pipe(Layer.provideMerge(DatabaseTest));

const yesterday = DateTime.makeUnsafe("2026-11-10T12:00:00Z");

const midnight = DateTime.makeUnsafe("2026-11-11T00:00:00Z");

// A synthetic workspace created at `createdAt`, with `members` members.
const workspaceWith = Effect.fn("workspaceWith")(function* workspaceWith(
  members: number,
  createdAt: DateTime.Utc
) {
  const sql = yield* SqlClient.SqlClient;
  const id = WorkspaceIdSchema.make(randomUUID());
  const at = DateTime.toDate(createdAt);

  yield* sql`INSERT INTO auth.organization (id, name, slug, created_at)
    VALUES (${id}, 'Synthetic roster', ${`roster-${id}`}, ${at})`;

  for (let index = 0; index < members; index += 1) {
    const userId = randomUUID();

    yield* sql`INSERT INTO auth.user (id, name, email, created_at, updated_at)
      VALUES (${userId}, 'Synthetic member', ${`${userId}@example.com`}, ${at}, ${at})`;
    yield* sql`INSERT INTO auth.member (organization_id, user_id, role, created_at)
      VALUES (${id}, ${userId}, 'member', ${at})`;
  }

  return id;
});

const removed = (ids: readonly WorkspaceId[]) =>
  SqlClient.SqlClient.use((sql) =>
    Effect.all([
      sql`DELETE FROM auth.user WHERE id IN (SELECT user_id FROM auth.member WHERE organization_id IN ${sql.in(ids)})`,
      sql`DELETE FROM auth.organization WHERE id IN ${sql.in(ids)}`,
    ])
  );

layer(RosterTest)("the workspace roster in Postgres", (it) => {
  it.effect(
    "pages through the workspaces in the order of their ids, with their members, created before an instant",
    () =>
      Effect.gen(function* pages() {
        const roster = yield* WorkspaceRoster;

        const seats = new Map([
          [yield* workspaceWith(2, yesterday), 2],
          [yield* workspaceWith(0, yesterday), 0],
          [yield* workspaceWith(1, yesterday), 1],
        ]);

        const made = [...seats.keys()].toSorted();
        const [first, ...rest] = made;
        const today = yield* workspaceWith(3, midnight);

        assert.isDefined(first);

        const ours = new Set<string>([...made, today]);

        // Every page after the first of ours, two at a time: other tests'
        // workspaces may come between.
        const seen: { members: number; workspaceId: WorkspaceId }[] = [];
        let after = Option.some(first);
        let more = true;

        while (more) {
          const page = yield* roster.seatsPage({
            after,
            createdBefore: midnight,
            limit: 2,
          });

          const last = page.at(-1);

          assert.isAtMost(page.length, 2);
          seen.push(...page.filter(({ workspaceId }) => ours.has(workspaceId)));
          more = page.length === 2;
          after = Option.fromUndefinedOr(last?.workspaceId);
        }

        assert.deepStrictEqual(
          seen,
          rest.map((workspaceId) => ({
            members: seats.get(workspaceId) ?? -1,
            workspaceId,
          }))
        );

        yield* removed([...made, today]);
      })
  );
});
