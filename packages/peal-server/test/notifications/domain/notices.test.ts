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
  isAboutPost,
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
  Uuid7Schema,
} from "#shared/domain/ids.ts";
import { readerOf } from "#test/notifications/support.ts";

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000001");

const userId = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

const workspaceId = WorkspaceIdSchema.make(
  "0b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
);

const channel: NoticeChannel = {
  handle: "@peal_example",
  platform: "mastodon",
};

// One event of each kind. The record is typed by the tags, so a kind added
// without a case here fails to compile.
const events: Readonly<Record<NoticeEvent["_tag"], NoticeEvent>> = {
  AdBoostChanged: {
    _tag: "AdBoostChanged",
    boostId: "00000000-0000-7000-8000-000000000061",
    budget: { amount: 5000, currency: "EUR" },
    budgetDigits: 2,
    change: "started",
    endsAt: DateTime.makeUnsafe("2026-11-17T10:00:00Z"),
    postId: PostIdSchema.make("00000000-0000-7000-8000-000000000062"),
    reason: Option.none(),
  },
  AdConnectionReconnectRequired: {
    _tag: "AdConnectionReconnectRequired",
    network: "meta",
  },
  ChannelReconnectRequired: { _tag: "ChannelReconnectRequired", channel },
  ChannelReconnectSoon: {
    _tag: "ChannelReconnectSoon",
    channel,
    expiresAt: DateTime.makeUnsafe("2026-12-01T09:30:00Z"),
  },
  CommentsReceived: {
    _tag: "CommentsReceived",
    count: 3,
    postId,
    threadId: Uuid7Schema.make("00000000-0000-7000-8000-00000000c0de"),
  },
  FeedStopped: {
    _tag: "FeedStopped",
    feedId: Uuid7Schema.make("00000000-0000-7000-8000-00000000fe01"),
    reason: "unreachable",
  },
  PostApprovalRequested: {
    _tag: "PostApprovalRequested",
    postId,
    scheduledAt: DateTime.makeUnsafe("2026-12-01T09:30:00Z"),
  },
  PostApproved: { _tag: "PostApproved", by: "visitor", late: false, postId },
  PostChangesRequested: {
    _tag: "PostChangesRequested",
    by: "member",
    postId,
  },
  PostCommented: { _tag: "PostCommented", by: "visitor", postId },
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
  RecyclingEnded: {
    _tag: "RecyclingEnded",
    reason: "planLimit",
    ruleId: Uuid7Schema.make("00000000-0000-7000-8000-00000000ec01"),
    sourcePostId: postId,
  },
  SubscriptionCancelled: {
    _tag: "SubscriptionCancelled",
    endsAt: DateTime.makeUnsafe("2026-12-09T10:00:00Z"),
    plan: "pro",
  },
  SubscriptionRenewing: {
    _tag: "SubscriptionRenewing",
    plan: "business",
    price: { amount: 25_000, currency: "eur" },
    renewsAt: DateTime.makeUnsafe("2027-01-01T00:00:00Z"),
  },
  SubscriptionStarted: {
    _tag: "SubscriptionStarted",
    interval: "year",
    plan: "business",
    price: { amount: 25_000, currency: "eur" },
    startedAt: DateTime.makeUnsafe("2026-11-09T10:00:00Z"),
    trialEnd: Option.none(),
  },
  SubscriptionWithdrawn: {
    _tag: "SubscriptionWithdrawn",
    plan: "starter",
    refunded: { amount: 642, currency: "eur" },
    withdrawnAt: DateTime.makeUnsafe("2026-11-12T08:00:00Z"),
  },
  PaymentMethodNeeded: {
    _tag: "PaymentMethodNeeded",
    accounts: 3,
    allowed: 2,
    graceUntil: DateTime.makeUnsafe("2027-01-31T00:00:00Z"),
  },
  PlansRetiring: {
    _tag: "PlansRetiring",
    endsAt: DateTime.makeUnsafe("2027-01-01T00:00:00Z"),
    plan: "starter",
  },
  AllowanceReached: {
    _tag: "AllowanceReached",
    allowed: 10_000,
    meter: "outboundMessages",
    resetsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
  },
  XSpendCeiling: {
    _tag: "XSpendCeiling",
    ceiling: 2500,
    percent: 80,
    resetsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
  },
  TrialEnding: {
    _tag: "TrialEnding",
    endsAt: DateTime.makeUnsafe("2026-11-23T10:00:00Z"),
    over: [],
    plan: "pro",
  },
  WebhookDeliveriesFailing: {
    _tag: "WebhookDeliveriesFailing",
    endpointId: "00000000-0000-7000-8000-000000000051",
    host: "hooks.example.com",
  },
  WebhookEndpointDisabled: {
    _tag: "WebhookEndpointDisabled",
    endpointId: "00000000-0000-7000-8000-000000000051",
    host: "hooks.example.com",
    reason: "failing",
  },
};

describe("notice events", () => {
  it("go to the members who can act on them", () => {
    expect(audienceOf(events.ChannelReconnectRequired)).toBe("channel:connect");
    expect(audienceOf(events.ChannelReconnectSoon)).toBe("channel:connect");
    expect(audienceOf(events.PostFailed)).toBe("post:schedule");
    expect(audienceOf(events.PostPublished)).toBe("post:schedule");
    expect(audienceOf(events.PostUnconfirmed)).toBe("post:schedule");

    for (const billing of [
      events.SubscriptionCancelled,
      events.SubscriptionRenewing,
      events.SubscriptionWithdrawn,
      events.TrialEnding,
      events.PaymentMethodNeeded,
      events.PlansRetiring,
      events.AllowanceReached,
      events.XSpendCeiling,
    ]) {
      expect(audienceOf(billing)).toBe("billing:manage");
      expect(pageOf(billing, workspaceId)).toBe(`/app/${workspaceId}/billing`);
    }
  });

  it("tell those who manage webhooks that an endpoint was turned off, always by email", () => {
    const nothing = changePreferences(defaultPreferences, {
      email: {
        channelReconnect: false,
        postFailed: false,
        postPublished: false,
        postUnconfirmed: false,
      },
    });

    expect(audienceOf(events.WebhookEndpointDisabled)).toBe("webhook:manage");
    expect(readerPermissionOf(events.WebhookEndpointDisabled)).toBe(
      "webhook:manage"
    );
    expect(pageOf(events.WebhookEndpointDisabled, workspaceId)).toBe(
      `/app/${workspaceId}/settings/webhooks`
    );
    expect(wantsEmail(nothing, events.WebhookEndpointDisabled)).toBeTruthy();
  });

  it("tell those who schedule posts that a rule ended, by email unless they turned it off", () => {
    const off = changePreferences(defaultPreferences, {
      email: { recyclingEnded: false },
    });

    expect(audienceOf(events.RecyclingEnded)).toBe("post:schedule");
    expect(isAboutPost(events.RecyclingEnded)).toBeTruthy();
    expect(pageOf(events.RecyclingEnded, workspaceId)).toBe(
      `/app/${workspaceId}/settings/recycling?rule=00000000-0000-7000-8000-00000000ec01`
    );
    expect(wantsEmail(defaultPreferences, events.RecyclingEnded)).toBeTruthy();
    expect(wantsEmail(off, events.RecyclingEnded)).toBeFalsy();
  });

  it("tell those who schedule posts that a feed stopped, by email unless they turned it off", () => {
    const off = changePreferences(defaultPreferences, {
      email: { feedStopped: false },
    });

    expect(audienceOf(events.FeedStopped)).toBe("post:schedule");
    expect(isAboutPost(events.FeedStopped)).toBeTruthy();
    expect(pageOf(events.FeedStopped, workspaceId)).toBe(
      `/app/${workspaceId}/settings/feeds?feed=00000000-0000-7000-8000-00000000fe01`
    );
    expect(wantsEmail(defaultPreferences, events.FeedStopped)).toBeTruthy();
    expect(wantsEmail(off, events.FeedStopped)).toBeFalsy();
  });

  it("tell those who manage webhooks that deliveries fail, by email unless they turned it off", () => {
    const off = changePreferences(defaultPreferences, {
      email: { webhookFailing: false },
    });

    expect(audienceOf(events.WebhookDeliveriesFailing)).toBe("webhook:manage");
    expect(pageOf(events.WebhookDeliveriesFailing, workspaceId)).toBe(
      `/app/${workspaceId}/settings/webhooks`
    );
    expect(
      wantsEmail(defaultPreferences, events.WebhookDeliveriesFailing)
    ).toBeTruthy();
    expect(wantsEmail(off, events.WebhookDeliveriesFailing)).toBeFalsy();
  });

  it("tell a boost's news to the owners, who answer for what it spends, always by email", () => {
    const nothing = changePreferences(defaultPreferences, {
      email: {
        channelReconnect: false,
        postFailed: false,
        postPublished: false,
        postUnconfirmed: false,
      },
    });

    expect(audienceOf(events.AdBoostChanged)).toBe("ads:authorize");
    expect(audienceOf(events.AdConnectionReconnectRequired)).toBe("ads:manage");
    expect(pageOf(events.AdBoostChanged, workspaceId)).toBe(
      `/app/${workspaceId}/posts/00000000-0000-7000-8000-000000000062`
    );
    expect(pageOf(events.AdConnectionReconnectRequired, workspaceId)).toBe(
      `/app/${workspaceId}/ads`
    );
    expect([
      wantsEmail(nothing, events.AdBoostChanged),
      wantsEmail(nothing, events.AdConnectionReconnectRequired),
    ]).toStrictEqual([true, true]);
  });

  it("email billing's always, whatever the reader chose", () => {
    const nothing = changePreferences(defaultPreferences, {
      email: {
        channelReconnect: false,
        postFailed: false,
        postPublished: false,
        postReview: true,
        postUnconfirmed: false,
      },
    });

    expect(wantsEmail(nothing, events.TrialEnding)).toBeTruthy();
    expect(wantsEmail(nothing, events.SubscriptionWithdrawn)).toBeTruthy();
    expect(wantsEmail(nothing, events.PostFailed)).toBeFalsy();
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

  it("tell a rule's starter that it ended, or everyone who may schedule once they left", () => {
    expect([
      recipientsOf(events.RecyclingEnded, Option.some(author), members),
      recipientsOf(
        events.RecyclingEnded,
        Option.some(UserIdSchema.make("9a1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f")),
        members
      ),
    ]).toStrictEqual([
      [author, follower],
      [follower, scheduler],
    ]);
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

describe("a post's review", () => {
  const author = UserIdSchema.make("1a1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");
  const scheduler = UserIdSchema.make("3a1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");
  const outsider = UserIdSchema.make("7a1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

  const people = [
    { followsEveryPost: false, mayAct: false, userId: author },
    { followsEveryPost: false, mayAct: true, userId: scheduler },
    { followsEveryPost: false, mayAct: false, userId: outsider },
  ];

  it("asks everyone who may approve, and tells the author, not who asked", () => {
    expect(
      recipientsOf(events.PostApprovalRequested, Option.some(author), people, {
        except: author,
      })
    ).toStrictEqual([scheduler]);

    expect(
      recipientsOf(events.PostApprovalRequested, Option.some(author), people)
    ).toStrictEqual([author, scheduler]);
  });

  it("tells the author and those who follow the post what was decided", () => {
    expect(
      recipientsOf(events.PostApproved, Option.some(author), people, {
        except: scheduler,
        followers: [outsider],
      })
    ).toStrictEqual([author, outsider]);
  });

  it("tells those who follow a post without an author, not everyone", () => {
    expect(
      recipientsOf(events.PostCommented, Option.none(), people, {
        followers: [outsider],
      })
    ).toStrictEqual([outsider]);
  });
});

describe("notification preferences", () => {
  it("email what needs the reader, not what went as planned, by default", () => {
    const emailed = Object.values(events).filter((event) =>
      wantsEmail(defaultPreferences, event)
    );

    expect(emailed.map(emailKindOf)).toStrictEqual([
      // A boost's news and an ad network's sign-in to renew: always.
      Option.none(),
      Option.none(),
      Option.some("channelReconnect"),
      Option.some("channelReconnect"),
      Option.some("feedStopped"),
      Option.some("postReview"),
      Option.some("postReview"),
      Option.some("postReview"),
      Option.some("postReview"),
      Option.some("postFailed"),
      Option.some("postUnconfirmed"),
      Option.some("recyclingEnded"),
      // Billing's nine, deliveries failing, then the webhook endpoint
      // turned off.
      Option.none(),
      Option.none(),
      Option.none(),
      Option.none(),
      Option.none(),
      Option.none(),
      Option.none(),
      Option.none(),
      Option.none(),
      Option.some("webhookFailing"),
      Option.none(),
    ]);
  });

  it("change only what a change names", () => {
    const changed = changePreferences(defaultPreferences, {
      email: { postFailed: false, postPublished: true },
    });

    expect(changed.email).toStrictEqual({
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
    });
    expect(wantsEmail(changed, events.PostPublished)).toBeTruthy();
    expect(wantsEmail(changed, events.PostFailed)).toBeFalsy();
    expect(changed.everyPost).toBeFalsy();
  });

  it("send the weekly digest only to those who asked for it", () => {
    expect(defaultPreferences.email.weeklyDigest).toBeFalsy();
    expect(
      changePreferences(defaultPreferences, { email: { weeklyDigest: true } })
        .email
    ).toStrictEqual({ ...defaultPreferences.email, weeklyDigest: true });
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
