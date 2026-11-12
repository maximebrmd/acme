// Staff turning a short link off through the console's routes: the link
// then answers 410, and the audit log keeps who did it and why; turned on
// again, it redirects.
import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { ShortLinks } from "#shortlinks/application/short-links.ts";
import { ShortLinksLive } from "#shortlinks/container.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import { liveTarget, OpenLinkStanding } from "#test/shortlinks/support.ts";
import {
  confirmedAccount,
  makeAdmin,
  signIn,
  TestApp,
  unconfirmedEmails,
} from "#test/workspace/integration/harness.ts";

const base = "http://links.example.com/api/l/";

const settings = { ...unconfirmedEmails, PEAL_SHORT_LINK_BASE: base };

const Test = Layer.mergeAll(
  TestApp.layerWith(settings),
  ShortLinksLive.pipe(
    Layer.provide(OpenLinkStanding),
    Layer.provide(
      ConfigProvider.layerAdd(ConfigProvider.fromUnknown(settings), {
        asPrimary: true,
      })
    ),
    Layer.provideMerge(DatabaseTest)
  )
);

const AuditRowsSchema = Schema.Array(
  Schema.Struct({
    action: Schema.String,
    reason: Schema.NullOr(Schema.String),
    workspace_id: Schema.NullOr(Schema.String),
  })
);

const browser = { "user-agent": "Mozilla/5.0 (synthetic browser)" };

layer(Test, { excludeTestServices: true, timeout: "120 seconds" })(
  "a short link staff turn off",
  (it) => {
    it.effect("answers 410 until they turn it on again, each recorded", () =>
      Effect.gen(function* turnedOff() {
        const app = yield* TestApp;
        const links = yield* ShortLinks;
        const sql = yield* SqlClient.SqlClient;

        const target = yield* liveTarget("reported-link", true);
        const workspaceId = WorkspaceIdSchema.make(target.workspaceId);

        const [shortUrl = ""] = yield* links.issue({
          channelId: ChannelIdSchema.make(target.channelId),
          destinations: ["https://example.test/reported-landing"],
          part: 0,
          postId: PostIdSchema.make(target.postId),
          targetId: PostTargetIdSchema.make(target.targetId),
          workspaceId,
        });

        const code = shortUrl.slice(base.length);
        const { pathname } = new URL(shortUrl);

        const staff = yield* confirmedAccount("short-link-staff");

        yield* makeAdmin(staff.id);

        const cookie = yield* signIn(staff.email);
        const reason = "Synthetic report of a misleading link";

        const read = yield* app.request(`/api/admin/short-links/${code}`, {
          headers: { cookie },
        });

        assert.strictEqual(read.status, 200);

        const off = yield* app.request(
          `/api/admin/short-links/${code}/disable`,
          { body: { reason }, headers: { cookie }, method: "POST" }
        );

        assert.strictEqual(off.status, 200);
        assert.strictEqual(
          (yield* app.request(pathname, { headers: browser })).status,
          410
        );

        const on = yield* app.request(`/api/admin/short-links/${code}/enable`, {
          body: { reason },
          headers: { cookie },
          method: "POST",
        });

        assert.strictEqual(on.status, 200);
        assert.strictEqual(
          (yield* app.request(pathname, { headers: browser })).status,
          302
        );

        const recorded =
          yield* sql`SELECT action, reason, workspace_id FROM staff.audit_events WHERE object_ids ->> 'code' = ${code} ORDER BY at, id`.pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(AuditRowsSchema)),
            Effect.orDie
          );

        assert.deepStrictEqual(recorded, [
          { action: "disableShortLink", reason, workspace_id: workspaceId },
          { action: "enableShortLink", reason, workspace_id: workspaceId },
        ]);

        // Every link of the workspace at once, recorded once.
        const all = yield* app.request(
          `/api/admin/workspaces/${workspaceId}/short-links/disable`,
          { body: { reason }, headers: { cookie }, method: "POST" }
        );

        assert.strictEqual(all.status, 200);
        assert.deepStrictEqual(all.body, { disabled: 1 });
        assert.strictEqual(
          (yield* app.request(pathname, { headers: browser })).status,
          410
        );

        const listed = yield* app.request(
          `/api/admin/workspaces/${workspaceId}/short-links`,
          { headers: { cookie } }
        );

        assert.strictEqual(listed.status, 200);

        // Anyone else is told nothing is there.
        const refused = yield* app.request(
          `/api/admin/short-links/${code}/disable`,
          { body: { reason }, method: "POST" }
        );

        assert.strictEqual(refused.status, 404);
      })
    );
  }
);
