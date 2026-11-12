// The short links' endpoints, as a member reaches them: who may read and
// set what, the clicks over a range, and a link's days.
import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { TestClock } from "effect/testing";
import { Api } from "peal-contract";
import type { Member } from "peal-contract";

import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { ShortLinks } from "#shortlinks/application/short-links.ts";
import { ShortLinksApiLive, ShortLinksLive } from "#shortlinks/container.ts";
import {
  DatabaseTest,
  freshWorkspace,
  memberOf,
} from "#test/channels/support.ts";
import { OpenLinkStanding } from "#test/shortlinks/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import type { Role } from "#workspace/domain/roles.ts";

const base = "https://go.example.test/";

const ShortLinksTest = ShortLinksLive.pipe(
  Layer.provide(OpenLinkStanding),
  Layer.provide(
    ConfigProvider.layerAdd(
      ConfigProvider.fromUnknown({ PEAL_SHORT_LINK_BASE: base }),
      { asPrimary: true }
    )
  ),
  Layer.provideMerge(DatabaseTest)
);

// A client of the endpoints acting as the member.
const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["shortLinks"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        ShortLinksApiLive.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const as = (role: Role, workspaceId: WorkspaceId) =>
  clientAs(memberOf(workspaceId, permissionsFor(role)));

const browser = {
  method: "GET",
  purpose: undefined,
  userAgent: "Mozilla/5.0 (synthetic browser)",
};

layer(ShortLinksTest)("the short links' endpoints", (it) => {
  it.effect("say what the server offers, and let owners set the default", () =>
    Effect.gen(function* status() {
      const workspaceId = yield* freshWorkspace;
      const owner = yield* as("owner", workspaceId);
      const editor = yield* as("editor", workspaceId);

      assert.deepStrictEqual(
        yield* editor.shortLinks.status({ params: { workspaceId } }),
        {
          available: true,
          base,
          byDefault: false,
          shortLength: base.length + 7,
        }
      );

      const refused = yield* editor.shortLinks
        .setDefault({ params: { workspaceId }, payload: { byDefault: true } })
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "Forbidden");

      yield* owner.shortLinks.setDefault({
        params: { workspaceId },
        payload: { byDefault: true },
      });

      assert.isTrue(
        (yield* editor.shortLinks.status({ params: { workspaceId } })).byDefault
      );
    })
  );

  it.effect(
    "list a workspace's links with their clicks, to those who read analytics",
    () =>
      Effect.gen(function* listed() {
        const links = yield* ShortLinks;
        const workspaceId = yield* freshWorkspace;
        const postId = yield* newId(PostIdSchema);
        const channelId = yield* newId(ChannelIdSchema);

        yield* TestClock.setTime(Date.parse("1890-05-10T12:00:00Z"));

        const [first = "", second = ""] = yield* links.issue({
          channelId,
          destinations: ["https://example.test/a", "https://example.test/b"],
          part: 0,
          postId,
          targetId: yield* newId(PostTargetIdSchema),
          workspaceId,
        });

        yield* links.follow(first.slice(base.length), browser);
        yield* links.follow(first.slice(base.length), browser);

        const owner = yield* as("owner", workspaceId);

        const page = yield* owner.shortLinks.list({
          params: { workspaceId },
          query: { from: "1890-05-01", postId, to: "1890-05-31" },
        });

        assert.deepStrictEqual(page.period, {
          from: "1890-05-01",
          to: "1890-05-31",
        });
        assert.deepStrictEqual(
          page.items.map(({ clicks, destination, shortUrl }) => ({
            clicks,
            destination,
            shortUrl,
          })),
          [
            {
              clicks: 0,
              destination: "https://example.test/b",
              shortUrl: second,
            },
            {
              clicks: 2,
              destination: "https://example.test/a",
              shortUrl: first,
            },
          ]
        );

        const [linkB] = page.items;

        assert(linkB !== undefined);

        const one = yield* owner.shortLinks.get({
          params: { linkId: page.items[1]?.id ?? "", workspaceId },
          query: { from: "1890-05-09", to: "1890-05-11" },
        });

        assert.deepStrictEqual(one.days, [
          { clicks: 0, day: "1890-05-09" },
          { clicks: 2, day: "1890-05-10" },
          { clicks: 0, day: "1890-05-11" },
        ]);
        assert.strictEqual(one.link.clicks, 2);

        const tooLong = yield* owner.shortLinks
          .list({
            params: { workspaceId },
            query: { from: "1890-01-01", to: "1890-05-31" },
          })
          .pipe(Effect.flip);

        assert.strictEqual(tooLong._tag, "InvalidDateRange");

        // Another workspace's link is not found.
        const other = yield* as("owner", yield* freshWorkspace);

        const missing = yield* other.shortLinks
          .get({ params: { linkId: linkB.id, workspaceId }, query: {} })
          .pipe(Effect.flip);

        assert.strictEqual(missing._tag, "ShortLinkNotFound");

        // An API key granted posts but not analytics.
        const postsOnly = yield* clientAs(memberOf(workspaceId, ["post:read"]));

        const denied = yield* postsOnly.shortLinks
          .list({ params: { workspaceId }, query: {} })
          .pipe(Effect.flip);

        assert.strictEqual(denied._tag, "Forbidden");
      })
  );
});
