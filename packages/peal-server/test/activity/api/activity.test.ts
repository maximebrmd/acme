import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api, defaultActivityPageSize } from "peal-contract";
import type { Member } from "peal-contract";

import { ActivityHandlers } from "#activity/api/activity.ts";
import { ActivityLog } from "#activity/application/activity-log.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  ActivityTest,
  changeBy,
  namedClient,
  namedKey,
} from "#test/activity/support.ts";
import { freshWorkspace, memberOf } from "#test/channels/support.ts";
import { freshUser } from "#test/notifications/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// A client of the activity endpoint whose every request acts as the
// member, as the WorkspaceAccess middleware would hand them to the handler.
const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["activity"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        ActivityHandlers.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const owner = (workspaceId: WorkspaceId) =>
  memberOf(workspaceId, permissionsFor("owner"));

layer(ActivityTest)("the activity endpoint", (it) => {
  it.effect("shows an owner the workspace's events, as the contract says", () =>
    Effect.gen(function* shown() {
      const log = yield* ActivityLog;
      const workspaceId = yield* freshWorkspace;
      const userId = yield* freshUser;
      const client = yield* clientAs(owner(workspaceId));

      const inPerson = yield* log.record(
        changeBy(workspaceId, userId, {
          named: { postId: "0195d2c0-0000-7000-8000-000000000001" },
          operation: "posts.schedule",
          requestId: Option.some("activity-test-0003"),
          status: Option.some(200),
        })
      );

      const byKey = yield* log.record(
        changeBy(workspaceId, userId, {
          actor: { _tag: "apiKey", apiKeyId: namedKey },
          errorCode: Option.some("post_not_found"),
          operation: "posts.cancel",
          status: Option.some(404),
          via: "apiKey",
        })
      );

      const byTool = yield* log.record(
        changeBy(workspaceId, userId, {
          clientId: Option.some(namedClient),
          impersonated: true,
          operation: "mcp.create_draft",
          status: Option.none(),
          via: "mcp",
        })
      );

      const page = yield* client.activity.list({
        params: { workspaceId },
        query: {},
      });

      assert.deepStrictEqual(page, {
        items: [
          {
            actor: { _tag: "user", userId },
            application: { id: namedClient, name: "Synthetic client" },
            errorCode: null,
            id: byTool.id,
            impersonated: true,
            objectIds: {},
            occurredAt: byTool.occurredAt,
            operation: "mcp.create_draft",
            requestId: null,
            status: null,
            via: "mcp",
          },
          {
            actor: { _tag: "apiKey", apiKeyId: namedKey },
            application: { id: namedKey, name: "Synthetic key" },
            errorCode: "post_not_found",
            id: byKey.id,
            impersonated: false,
            objectIds: {},
            occurredAt: byKey.occurredAt,
            operation: "posts.cancel",
            requestId: null,
            status: 404,
            via: "apiKey",
          },
          {
            actor: { _tag: "user", userId },
            application: null,
            errorCode: null,
            id: inPerson.id,
            impersonated: false,
            objectIds: { postId: "0195d2c0-0000-7000-8000-000000000001" },
            occurredAt: inPerson.occurredAt,
            operation: "posts.schedule",
            requestId: "activity-test-0003",
            status: 200,
            via: "session",
          },
        ],
        nextCursor: null,
      });
    })
  );

  it.effect("pages with the cursor, and filters by operation and actor", () =>
    Effect.gen(function* pages() {
      const log = yield* ActivityLog;
      const workspaceId = yield* freshWorkspace;
      const ana = yield* freshUser;
      const ben = yield* freshUser;
      const client = yield* clientAs(owner(workspaceId));
      const params = { workspaceId };

      const made = yield* Effect.forEach(
        [
          changeBy(workspaceId, ana, { operation: "posts.create" }),
          changeBy(workspaceId, ben, { operation: "posts.schedule" }),
          changeBy(workspaceId, ana, { operation: "posts.schedule" }),
        ],
        (entry) => log.record(entry)
      );

      const newest = made.map(({ id }) => id).toReversed();

      const first = yield* client.activity.list({
        params,
        query: { limit: 2 },
      });

      assert.deepStrictEqual(
        first.items.map(({ id }) => id),
        newest.slice(0, 2)
      );
      assert.strictEqual(first.nextCursor, newest[1]);

      const second = yield* client.activity.list({
        params,
        query: { cursor: first.nextCursor ?? "", limit: 2 },
      });

      assert.deepStrictEqual(
        second.items.map(({ id }) => id),
        newest.slice(2)
      );
      assert.isNull(second.nextCursor);

      const scheduledByAna = yield* client.activity.list({
        params,
        query: { actor: ana, operation: "posts.schedule" },
      });

      assert.deepStrictEqual(
        scheduledByAna.items.map(({ id }) => id),
        newest.slice(0, 1)
      );

      // A cursor that is no event's id is the caller's mistake.
      const refused = yield* client.activity
        .list({ params, query: { cursor: "not-a-cursor" } })
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "BadRequest");
    })
  );

  it.effect("holds a page of thirty unless asked otherwise", () =>
    Effect.gen(function* pageSize() {
      const log = yield* ActivityLog;
      const workspaceId = yield* freshWorkspace;
      const userId = yield* freshUser;
      const client = yield* clientAs(owner(workspaceId));

      yield* Effect.forEach(
        Array.from({ length: defaultActivityPageSize + 1 }),
        () => log.record(changeBy(workspaceId, userId)),
        { discard: true }
      );

      const page = yield* client.activity.list({
        params: { workspaceId },
        query: {},
      });

      assert.lengthOf(page.items, defaultActivityPageSize);
      assert.isNotNull(page.nextCursor);
    })
  );

  it.effect("refuses anyone but an owner, naming the permission", () =>
    Effect.gen(function* refusals() {
      const workspaceId = yield* freshWorkspace;

      for (const role of ["admin", "editor", "viewer"] as const) {
        const client = yield* clientAs(
          memberOf(workspaceId, permissionsFor(role))
        );

        const refused = yield* client.activity
          .list({ params: { workspaceId }, query: {} })
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "Forbidden");
        assert.deepStrictEqual(
          refused._tag === "Forbidden"
            ? [refused.reason, refused.permission]
            : [],
          ["missingPermission", "activity:read"]
        );
      }
    })
  );
});
