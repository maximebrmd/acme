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
} from "#notifications/domain/notice-event.ts";
import type {
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

  it("link to the page where they are acted on", () => {
    expect(pageOf(events.ChannelReconnectSoon, workspaceId)).toBe(
      `/app/${workspaceId}/channels`
    );
    expect(pageOf(events.PostFailed, workspaceId)).toBe(
      `/app/${workspaceId}/posts/${postId}`
    );
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
