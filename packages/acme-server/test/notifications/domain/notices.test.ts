import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { authorizeInbox } from "#notifications/domain/inbox-reader.ts";
import type {
  InboxAction,
  InboxReader,
} from "#notifications/domain/inbox-reader.ts";
import {
  audienceOf,
  emailKindOf,
  pageOf,
  readerPermissionOf,
  recipientsOf,
} from "#notifications/domain/notice-event.ts";
import type {
  Candidate,
  NoticeChannel,
  NoticeEvent,
} from "#notifications/domain/notice-event.ts";
import {
  changePreferences,
  defaultPreferences,
  wantsEmail,
} from "#notifications/domain/notification-preferences.ts";
import {
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { readerOf } from "#test/notifications/support.ts";

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000001");

const userId = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

const workspaceId = WorkspaceIdSchema.make(
  "0b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
);

const channel: NoticeChannel = {
  handle: "@acme_example",
  platform: "mastodon",
};

// One event of each kind. The record is typed by the tags, so a kind added
// without a case here fails to compile.
const events: Readonly<Record<NoticeEvent["_tag"], NoticeEvent>> = {
  ChannelReconnectRequired: { _tag: "ChannelReconnectRequired", channel },
  ChannelReconnectSoon: {
    _tag: "ChannelReconnectSoon",
    channel,
    expiresAt: DateTime.makeUnsafe("2026-12-01T09:30:00Z"),
  },
  PostFailed: {
    _tag: "PostFailed",
    channel: Option.some(channel),
    postId,
    reason: "rateLimited",
  },
  PostPublished: {
    _tag: "PostPublished",
    channel: Option.some(channel),
    permalink: Option.none(),
    postId,
  },
  PostUnconfirmed: {
    _tag: "PostUnconfirmed",
    channel: Option.none(),
    postId,
  },
};

describe("notice events", () => {
  it("go to the members who can act on them", () => {
    expect(audienceOf(events.ChannelReconnectRequired)).toBe("channel:connect");
    expect(audienceOf(events.ChannelReconnectSoon)).toBe("channel:connect");
    expect(audienceOf(events.PostFailed)).toBe("post:schedule");
    expect(audienceOf(events.PostPublished)).toBe("post:schedule");
    expect(audienceOf(events.PostUnconfirmed)).toBe("post:schedule");
  });

  it("need their readers to still read posts, or still act on a channel", () => {
    expect(readerPermissionOf(events.PostFailed)).toBe("post:read");
    expect(readerPermissionOf(events.PostUnconfirmed)).toBe("post:read");
    expect(readerPermissionOf(events.ChannelReconnectSoon)).toBe(
      "channel:connect"
    );
  });

  it("link to the page where they are acted on", () => {
    expect(pageOf(events.ChannelReconnectSoon, workspaceId)).toBe(
      `/app/${workspaceId}/channels`
    );
    expect(pageOf(events.PostFailed, workspaceId)).toBe(
      `/app/${workspaceId}/posts/${postId}`
    );
  });
});

describe(recipientsOf, () => {
  const author = UserIdSchema.make("1a1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

  const follower = UserIdSchema.make("2a1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

  const scheduler = UserIdSchema.make("3a1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

  const reader = UserIdSchema.make("4a1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

  // The author is a contributor: they may not act on the post.
  const members: readonly Candidate[] = [
    { followsEveryPost: false, mayAct: false, userId: author },
    { followsEveryPost: true, mayAct: true, userId: follower },
    { followsEveryPost: false, mayAct: true, userId: scheduler },
    { followsEveryPost: true, mayAct: false, userId: reader },
  ];

  it("tell a post's author and the members who may act and follow every post", () => {
    expect(
      recipientsOf(events.PostFailed, Option.some(author), members)
    ).toStrictEqual([author, follower]);
  });

  it("tell every member who may act about a post without an author", () => {
    expect(
      recipientsOf(events.PostPublished, Option.none(), members)
    ).toStrictEqual([follower, scheduler]);
  });

  it("tell an author who left the workspace nothing, and every member who may act instead", () => {
    expect(
      recipientsOf(
        events.PostUnconfirmed,
        Option.some(UserIdSchema.make("9a1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f")),
        members
      )
    ).toStrictEqual([follower, scheduler]);
  });

  it("tell every member who may act about a channel, whatever they follow", () => {
    expect(
      recipientsOf(
        events.ChannelReconnectRequired,
        Option.some(author),
        members
      )
    ).toStrictEqual([follower, scheduler]);
  });
});

describe("notification preferences", () => {
  it("email what needs the reader, not what went as planned, by default", () => {
    const emailed = Object.values(events).filter((event) =>
      wantsEmail(defaultPreferences, event)
    );

    expect(emailed.map(emailKindOf)).toStrictEqual([
      "channelReconnect",
      "channelReconnect",
      "postFailed",
      "postUnconfirmed",
    ]);
  });

  it("change only what a change names", () => {
    const changed = changePreferences(defaultPreferences, {
      email: { postFailed: false, postPublished: true },
    });

    expect(changed.email).toStrictEqual({
      channelReconnect: true,
      postFailed: false,
      postPublished: true,
      postUnconfirmed: true,
    });
    expect(wantsEmail(changed, events.PostPublished)).toBeTruthy();
    expect(wantsEmail(changed, events.PostFailed)).toBeFalsy();
    expect(changed.everyPost).toBeFalsy();
  });

  it("follow only one's own posts until asked for every post", () => {
    const following = changePreferences(defaultPreferences, {
      everyPost: true,
    });

    expect(defaultPreferences.everyPost).toBeFalsy();
    expect(following.everyPost).toBeTruthy();
    expect(following.email).toStrictEqual(defaultPreferences.email);
  });
});

const allowed = (reader: InboxReader, action: InboxAction) =>
  Result.isSuccess(authorizeInbox(reader, action));

describe(authorizeInbox, () => {
  it("lets the user read and change their own", () => {
    expect(allowed(readerOf(userId), "read")).toBeTruthy();
    expect(allowed(readerOf(userId), "change")).toBeTruthy();
  });

  it("lets impersonating staff read, and change nothing", () => {
    const staff = readerOf(userId, { impersonated: true });

    expect(allowed(staff, "read")).toBeTruthy();
    expect(allowed(staff, "change")).toBeFalsy();
  });

  it("holds clients to the scopes the user agreed to", () => {
    const reading = readerOf(userId, {
      oauth: { boundToWorkspace: false, scopes: ["workspace:read"] },
    });

    const writing = readerOf(userId, {
      oauth: { boundToWorkspace: false, scopes: ["workspace:write"] },
    });

    const scopeless = readerOf(userId, {
      oauth: { boundToWorkspace: false, scopes: ["openid"] },
    });

    expect(allowed(reading, "read")).toBeTruthy();
    expect(allowed(reading, "change")).toBeFalsy();
    expect(allowed(writing, "change")).toBeTruthy();
    expect(allowed(scopeless, "read")).toBeFalsy();
  });

  it("refuses clients bound to one workspace, as notices span them all", () => {
    const bound = readerOf(userId, {
      oauth: { boundToWorkspace: true, scopes: ["workspace:write"] },
    });

    expect(allowed(bound, "read")).toBeFalsy();
    expect(allowed(bound, "change")).toBeFalsy();
  });
});
