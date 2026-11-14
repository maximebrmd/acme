import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiError, HttpApiTest } from "effect/http-api";
import { Api, Forbidden, Unauthenticated } from "peal-contract";
import type { Member, Principal } from "peal-contract";

import { Notify } from "#notifications/application/notify.ts";
import {
  NoticesApiLive,
  NotificationPreferencesApiLive,
} from "#notifications/container.ts";
import { newId } from "#shared/application/ids.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { freshWorkspace } from "#test/channels/support.ts";
import { freshUser, NoticesTest } from "#test/notifications/support.ts";
import { TestDirectory } from "#test/notifications/test-directory.ts";
import {
  anonymousSecurityTest,
  securityTest,
} from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The endpoints of a user's notices and preferences on the real use cases
// and Postgres. Each request authenticates as a principal, as the
// Authentication middleware would.

const HandlersLive = Layer.mergeAll(
  NoticesApiLive,
  NotificationPreferencesApiLive
);

const groups = ["notices", "notificationPreferences"] as const;

const clientWith = <E, R>(
  security: Layer.Layer<Layer.Success<typeof anonymousSecurityTest>, E, R>
) =>
  HttpApiTest.groups(Api, groups).pipe(
    Effect.provide(
      Layer.mergeAll(
        HandlersLive.pipe(Layer.provideMerge(security)),
        HttpServer.layerServices
      )
    )
  );

const memberAs = (principal: Principal, workspaceId: string): Member => ({
  permissions: [],
  principal,
  workspaceId,
});

const user = (
  userId: UserId,
  extra: Partial<Extract<Principal, { readonly _tag: "user" }>> = {}
): Principal => ({
  _tag: "user",
  impersonatedBy: null,
  userId,
  ...extra,
});

const clientAs = (principal: Principal, workspaceId: WorkspaceId) =>
  clientWith(securityTest(memberAs(principal, workspaceId)));

// A member of a workspace of their own, with two failed posts to hear about.
const memberWithNotices = Effect.gen(function* memberWithNotices() {
  const workspaceId = yield* freshWorkspace;
  const userId = yield* freshUser;

  yield* TestDirectory.use((directory) =>
    directory.setMembers(workspaceId, [
      {
        email: `member+${userId}@example.test`,
        locale: "en",
        permissions: permissionsFor("editor"),
        userId,
      },
    ])
  );

  const notify = yield* Notify;
  const failed = yield* newId(PostIdSchema);
  const unconfirmed = yield* newId(PostIdSchema);

  yield* notify.notify({
    event: {
      _tag: "PostFailed",
      channel: Option.some({ handle: "@peal_example", platform: "mastodon" }),
      postId: failed,
      reason: "mediaRejected",
    },
    key: `post-target:${failed}:1`,
    workspaceId,
  });

  yield* notify.notify({
    event: {
      _tag: "PostUnconfirmed",
      channel: Option.none(),
      postId: unconfirmed,
    },
    key: `post-target:${unconfirmed}:1`,
    workspaceId,
  });

  return { failed, unconfirmed, userId, workspaceId };
});

layer(NoticesTest)("the notices endpoints", (it) => {
  it.effect("list a user's notices as data, newest first", () =>
    Effect.gen(function* lists() {
      const { failed, unconfirmed, userId, workspaceId } =
        yield* memberWithNotices;

      const client = yield* clientAs(user(userId), workspaceId);

      const page = yield* client.notices.list({ query: {} });

      assert.deepStrictEqual(
        page.items.map(({ event, readAt, workspaceId: inWorkspace }) => ({
          event,
          inWorkspace,
          readAt,
        })),
        [
          {
            event: {
              _tag: "PostUnconfirmed",
              channel: null,
              postId: unconfirmed,
            },
            inWorkspace: workspaceId,
            readAt: null,
          },
          {
            event: {
              _tag: "PostFailed",
              channel: { handle: "@peal_example", platform: "mastodon" },
              postId: failed,
              reason: "mediaRejected",
            },
            inWorkspace: workspaceId,
            readAt: null,
          },
        ]
      );
      assert.isNull(page.nextCursor);

      const first = yield* client.notices.list({ query: { limit: 1 } });

      assert.lengthOf(first.items, 1);
      assert.isString(first.nextCursor);

      const rest = yield* client.notices.list({
        query: { cursor: first.nextCursor ?? "" },
      });

      assert.deepStrictEqual(
        rest.items.map(({ id }) => id),
        [page.items[1]?.id]
      );
    })
  );

  it.effect("count unread notices, and mark them read", () =>
    Effect.gen(function* marks() {
      const { userId, workspaceId } = yield* memberWithNotices;
      const other = yield* memberWithNotices;
      const client = yield* clientAs(user(userId), workspaceId);
      const otherClient = yield* clientAs(user(other.userId), workspaceId);

      assert.deepStrictEqual(yield* client.notices.unread(), { unread: 2 });

      const { items } = yield* client.notices.list({ query: {} });
      const theirs = (yield* otherClient.notices.list({ query: {} })).items;

      // Ids that are not notices, or someone else's, change nothing.
      assert.deepStrictEqual(
        yield* client.notices.markRead({
          payload: {
            ids: [items[0]?.id ?? "", "not-a-notice", theirs[0]?.id ?? ""],
          },
        }),
        { unread: 1 }
      );
      assert.deepStrictEqual(yield* otherClient.notices.unread(), {
        unread: 2,
      });

      const listed = yield* client.notices.list({ query: {} });

      assert.isNotNull(listed.items[0]?.readAt);
      assert.isNull(listed.items[1]?.readAt);

      assert.deepStrictEqual(yield* client.notices.markAllRead(), {
        unread: 0,
      });
    })
  );

  it.effect("answer 400 to a cursor that is not one", () =>
    Effect.gen(function* badCursor() {
      const { userId, workspaceId } = yield* memberWithNotices;
      const client = yield* clientAs(user(userId), workspaceId);

      const failure = yield* Effect.flip(
        client.notices.list({ query: { cursor: "studio" } })
      );

      assert.instanceOf(failure, HttpApiError.BadRequest);
    })
  );

  it.effect("let impersonating staff read, and change nothing", () =>
    Effect.gen(function* impersonated() {
      const { userId, workspaceId } = yield* memberWithNotices;
      const staffId = yield* freshUser;

      const client = yield* clientAs(
        user(userId, { impersonatedBy: staffId }),
        workspaceId
      );

      assert.lengthOf((yield* client.notices.list({ query: {} })).items, 2);
      assert.instanceOf(
        yield* Effect.flip(client.notices.markAllRead()),
        Forbidden
      );
      assert.instanceOf(
        yield* Effect.flip(
          client.notificationPreferences.update({
            payload: { email: { postFailed: false } },
          })
        ),
        Forbidden
      );
    })
  );

  it.effect("refuse API keys and clients bound to one workspace", () =>
    Effect.gen(function* refused() {
      const { userId, workspaceId } = yield* memberWithNotices;

      const key = yield* clientAs(
        {
          _tag: "apiKey",
          apiKeyId: "synthetic-key",
          permissions: permissionsFor("owner"),
          workspaceId,
        },
        workspaceId
      );

      const bound = yield* clientAs(
        user(userId, {
          oauth: {
            clientId: "synthetic-mcp-client",
            scopes: ["workspace:read"],
            workspaceId,
          },
        }),
        workspaceId
      );

      assert.instanceOf(
        yield* Effect.flip(key.notices.list({ query: {} })),
        Forbidden
      );
      assert.instanceOf(yield* Effect.flip(key.notices.unread()), Forbidden);
      assert.instanceOf(
        yield* Effect.flip(key.notificationPreferences.get()),
        Forbidden
      );
      assert.instanceOf(yield* Effect.flip(bound.notices.unread()), Forbidden);
    })
  );

  it.effect("refuse a user banned since their session was cached", () =>
    Effect.gen(function* banned() {
      const { userId, workspaceId } = yield* memberWithNotices;
      const client = yield* clientAs(user(userId), workspaceId);

      yield* TestDirectory.use((directory) => directory.ban(userId));

      assert.instanceOf(yield* Effect.flip(client.notices.unread()), Forbidden);
      assert.instanceOf(
        yield* Effect.flip(client.notificationPreferences.get()),
        Forbidden
      );
    })
  );

  it.effect("answer 401 without credentials", () =>
    Effect.gen(function* anonymous() {
      const client = yield* clientWith(anonymousSecurityTest);

      assert.instanceOf(
        yield* Effect.flip(client.notices.unread()),
        Unauthenticated
      );
      assert.instanceOf(
        yield* Effect.flip(client.notificationPreferences.get()),
        Unauthenticated
      );
    })
  );
});

layer(NoticesTest)("the notification preferences endpoints", (it) => {
  it.effect("start from the defaults, and change what a request names", () =>
    Effect.gen(function* changes() {
      const workspaceId = yield* freshWorkspace;
      const userId = yield* freshUser;
      const client = yield* clientAs(user(userId), workspaceId);

      assert.deepStrictEqual(yield* client.notificationPreferences.get(), {
        email: {
          automations: true,
          channelReconnect: true,
          comments: false,
          feedStopped: true,
          postFailed: true,
          postPublished: false,
          postReview: true,
          postUnconfirmed: true,
          recyclingEnded: true,
          webhookFailing: true,
          weeklyDigest: false,
        },
        everyPost: false,
      });

      yield* client.notificationPreferences.update({
        payload: { email: { postPublished: true } },
      });

      assert.deepStrictEqual(
        yield* client.notificationPreferences.update({
          payload: { email: { postFailed: false } },
        }),
        {
          email: {
            automations: true,
            channelReconnect: true,
            comments: false,
            feedStopped: true,
            postFailed: false,
            postPublished: true,
            postReview: true,
            postUnconfirmed: true,
            recyclingEnded: true,
            webhookFailing: true,
            weeklyDigest: false,
          },
          everyPost: false,
        }
      );
      assert.deepStrictEqual(
        (yield* client.notificationPreferences.get()).email.postPublished,
        true
      );

      // Following every post leaves the emails as they are.
      const following = yield* client.notificationPreferences.update({
        payload: { everyPost: true },
      });

      assert.isTrue(following.everyPost);
      assert.isFalse(following.email.postFailed);
      assert.isTrue(following.email.postPublished);

      // Rules acting by themselves are turned off as any other email.
      yield* client.notificationPreferences.update({
        payload: { email: { automations: false } },
      });

      assert.isFalse(
        (yield* client.notificationPreferences.get()).email.automations
      );

      // The weekly digest is asked for, and stopped, as any other email.
      const digest = yield* client.notificationPreferences.update({
        payload: { email: { weeklyDigest: true } },
      });

      assert.isTrue(digest.email.weeklyDigest);
      assert.isTrue(digest.email.postPublished);

      assert.isFalse(
        (yield* client.notificationPreferences.update({
          payload: { email: { weeklyDigest: false } },
        })).email.weeklyDigest
      );
    })
  );
});
