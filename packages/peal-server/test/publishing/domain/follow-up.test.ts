import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { FollowUpIdSchema } from "#publishing/domain/follow-up-id.ts";
import { FollowUpRuleIdSchema } from "#publishing/domain/follow-up-rule-id.ts";
import {
  actsUntil,
  approveFollowUpRule,
  changeFollowUpRule,
  endFollowUpRule,
  mayAct,
  startFollowUpRule,
} from "#publishing/domain/follow-up-rule.ts";
import type { NewFollowUpRule } from "#publishing/domain/follow-up-rule.ts";
import {
  armFollowUp,
  beginFollowUpCall,
  cancelFollowUp,
  expireFollowUp,
  isPast,
  settleFollowUp,
  triggerFollowUp,
  wasAttempted,
} from "#publishing/domain/follow-up.ts";
import type { FollowUp } from "#publishing/domain/follow-up.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";

const utc = (text: string) => DateTime.makeUnsafe(text);

const workspaceId = WorkspaceIdSchema.make(
  "0b6c3b1e-2f6d-4a8e-9f0a-3c5d7e9f1a2b"
);

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000101");

const channelId = ChannelIdSchema.make("00000000-0000-7000-8000-000000000201");

const ruleId = FollowUpRuleIdSchema.make(
  "00000000-0000-7000-8000-000000000301"
);

const approver = UserIdSchema.make("7d1f3a5b-9c2e-4f6a-8b0d-1e3f5a7c9b2d");

const newRule = (more: Partial<NewFollowUpRule> = {}): NewFollowUpRule => ({
  comment: Option.some("Thanks for all the likes!"),
  id: ruleId,
  likes: 50,
  needsApproval: false,
  repost: false,
  scope: { _tag: "post", postId },
  startedBy: Option.none(),
  startedVia: { _tag: "web" },
  workspaceId,
  ...more,
});

const now = utc("2026-06-15T07:00:00Z");

const armed = (): FollowUp =>
  armFollowUp(
    {
      channelId,
      id: FollowUpIdSchema.make("00000000-0000-7000-8000-000000000401"),
      kind: "comment",
      postId,
      ruleId,
      targetId: PostTargetIdSchema.make("00000000-0000-7000-8000-000000000501"),
      until: actsUntil(now),
      workspaceId,
    },
    now
  );

const later = (hours: number) => DateTime.add(now, { hours });

const sending = () => Result.getOrThrow(triggerFollowUp(armed(), 51, later(2)));

describe("a follow-up rule", () => {
  it("needs no approval when its starter publishes without one", () => {
    const rule = startFollowUpRule(newRule(), now);

    expect(rule.approval._tag).toBe("notNeeded");
    expect(mayAct(rule, false)).toBeTruthy();
  });

  it("waits for an approval its starter's posts would wait for", () => {
    const rule = startFollowUpRule(newRule({ needsApproval: true }), now);

    expect(rule.approval._tag).toBe("pending");
    expect(mayAct(rule, true)).toBeFalsy();

    const approved = Result.getOrThrow(
      approveFollowUpRule(rule, approver, later(1))
    );

    expect(approved.approval).toStrictEqual({
      _tag: "approved",
      approvedAt: later(1),
      approvedBy: approver,
    });
    expect(mayAct(approved, true)).toBeTruthy();
  });

  it("does not act on its own say once its starter's posts wait for approvals", () => {
    const rule = startFollowUpRule(newRule(), now);

    expect(mayAct(rule, true)).toBeFalsy();
  });

  it("asks again when what it sends changes, never for its threshold or a pause", () => {
    const approved = Result.getOrThrow(
      approveFollowUpRule(
        startFollowUpRule(newRule({ needsApproval: true }), now),
        approver,
        now
      )
    );

    const threshold = Result.getOrThrow(
      changeFollowUpRule(approved, { likes: 10, paused: true }, true, now)
    );

    expect(threshold.approval._tag).toBe("approved");
    expect(threshold.status._tag).toBe("paused");
    expect(threshold.likes).toBe(10);

    const text = Result.getOrThrow(
      changeFollowUpRule(
        approved,
        { comment: Option.some("Another text") },
        true,
        now
      )
    );

    expect(text.approval._tag).toBe("pending");

    const byOneWhoPublishes = Result.getOrThrow(
      changeFollowUpRule(approved, { repost: true }, false, now)
    );

    expect(byOneWhoPublishes.approval._tag).toBe("notNeeded");
  });

  it("changes no more once ended", () => {
    const stopped = endFollowUpRule(
      startFollowUpRule(newRule(), now),
      "stopped",
      now
    );

    expect(
      Result.isFailure(changeFollowUpRule(stopped, { likes: 2 }, false, now))
    ).toBeTruthy();
    expect(
      endFollowUpRule(stopped, "completed", later(1)).status
    ).toStrictEqual(stopped.status);
  });

  it("acts for seven days after a post went live", () => {
    expect(DateTime.formatIso(actsUntil(now))).toBe("2026-06-22T07:00:00.000Z");
  });
});

describe("a follow-up", () => {
  it("is sent once the threshold is reached within its window", () => {
    const followUp = sending();

    expect(followUp.status._tag).toBe("sending");
    expect(wasAttempted(followUp)).toBeFalsy();

    const begun = Result.getOrThrow(beginFollowUpCall(followUp, later(3)));

    expect(wasAttempted(begun)).toBeTruthy();
    expect(Result.isFailure(beginFollowUpCall(begun, later(3)))).toBeTruthy();

    const sent = Result.getOrThrow(
      settleFollowUp(
        begun,
        {
          _tag: "answered",
          result: {
            _tag: "published",
            platformPostId: PlatformPostIdSchema.make("reply-1"),
          },
        },
        later(3)
      )
    );

    expect(sent.status).toStrictEqual({
      _tag: "sent",
      likes: 51,
      permalink: Option.none(),
      platformPostId: "reply-1",
      sentAt: later(3),
      triggeredAt: later(2),
    });
  });

  it("is never triggered past its window", () => {
    const past = DateTime.add(now, { days: 7 });

    expect(isPast(armed(), past)).toBeTruthy();
    expect(Result.isFailure(triggerFollowUp(armed(), 99, past))).toBeTruthy();
    expect(
      Result.getOrThrow(expireFollowUp(armed(), "belowThreshold", past)).status
    ).toStrictEqual({
      _tag: "expired",
      expiredAt: past,
      reason: "belowThreshold",
    });
  });

  it("is armed again when the platform puts it off, nothing having gone out", () => {
    const begun = Result.getOrThrow(beginFollowUpCall(sending(), later(3)));

    for (const failure of [new PlatformUnavailable(), new RateLimited({})]) {
      expect(
        Result.getOrThrow(
          settleFollowUp(begun, { _tag: "refused", failure }, later(3))
        ).status
      ).toStrictEqual({ _tag: "armed", until: actsUntil(now) });
    }
  });

  it("fails on a refusal, with the platform's code and never its words", () => {
    const failed = Result.getOrThrow(
      settleFollowUp(
        sending(),
        {
          _tag: "refused",
          failure: new BadRequest({ code: "repliesNotAllowed" }),
        },
        later(3)
      )
    );

    expect(failed.status).toStrictEqual({
      _tag: "failed",
      code: Option.some("repliesNotAllowed"),
      failedAt: later(3),
      likes: 51,
      reason: "repliesNotAllowed",
      triggeredAt: later(2),
    });
  });

  it("stays unconfirmed when the platform may have taken it", () => {
    const begun = Result.getOrThrow(beginFollowUpCall(sending(), later(3)));

    const unconfirmed = Result.getOrThrow(
      settleFollowUp(
        begun,
        {
          _tag: "answered",
          result: { _tag: "unconfirmed", reason: "noResponse" },
        },
        later(4)
      )
    );

    expect(unconfirmed.status._tag).toBe("unconfirmed");
    expect(
      Result.isFailure(cancelFollowUp(unconfirmed, "ruleEnded", later(5)))
    ).toBeTruthy();
  });

  it("is given up only before its call sets out", () => {
    expect(
      Result.getOrThrow(cancelFollowUp(sending(), "ruleEnded", later(3))).status
        ._tag
    ).toBe("cancelled");

    const begun = Result.getOrThrow(beginFollowUpCall(sending(), later(3)));

    expect(
      Result.isFailure(cancelFollowUp(begun, "ruleEnded", later(3)))
    ).toBeTruthy();
  });
});
