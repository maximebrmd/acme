import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Schema } from "effect";
import {
  FollowUpAbilitySchema,
  FollowUpEndReasonSchema as ContractEndReasonSchema,
  FollowUpKindSchema as ContractKindSchema,
  FollowUpStatusSchema as ContractStatusSchema,
  followUpWindowDays,
  followUpsShown as contractShown,
  maxFollowUpCommentLength as contractCommentLength,
  maxFollowUpRulesPerWorkspace as contractRules,
  maxFollowUpsPerChannelDay as contractPerDay,
  maxLikesThreshold as contractMaxLikes,
  minLikesThreshold as contractMinLikes,
} from "peal-contract";

import { followUpView } from "#publishing/api/follow-up-view.ts";
import {
  followUpsShown,
  maxFollowUpCommentLength,
} from "#publishing/application/follow-up-rules.ts";
import { FollowUpAbilitySchema as AbilitySchema } from "#publishing/domain/follow-up-ability.ts";
import { FollowUpEndReasonSchema } from "#publishing/domain/follow-up-end-reason.ts";
import { FollowUpIdSchema } from "#publishing/domain/follow-up-id.ts";
import { FollowUpRuleIdSchema } from "#publishing/domain/follow-up-rule-id.ts";
import {
  followUpWindow,
  maxFollowUpRulesPerWorkspace,
  maxFollowUpsPerChannelDay,
  maxLikesThreshold,
  minLikesThreshold,
} from "#publishing/domain/follow-up-rule.ts";
import { FollowUpBlockerSchema } from "#publishing/domain/follow-up-support.ts";
import {
  FollowUpKindSchema,
  FollowUpStatusSchema,
  waitFollowUp,
} from "#publishing/domain/follow-up.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";

// The contract's copy of follow-up rules' limits and words, which clients
// read: equal to the server's.

describe("the follow-ups' contract", () => {
  it("copies the server's limits", () => {
    expect({
      commentLength: contractCommentLength,
      maxLikes: contractMaxLikes,
      minLikes: contractMinLikes,
      perDay: contractPerDay,
      rules: contractRules,
      shown: contractShown,
    }).toStrictEqual({
      commentLength: maxFollowUpCommentLength,
      maxLikes: maxLikesThreshold,
      minLikes: minLikesThreshold,
      perDay: maxFollowUpsPerChannelDay,
      rules: maxFollowUpRulesPerWorkspace,
      shown: followUpsShown,
    });
    expect(Duration.days(followUpWindowDays)).toStrictEqual(followUpWindow);
  });

  it("names what the server stores and answers", () => {
    expect(ContractKindSchema.literals).toStrictEqual(
      FollowUpKindSchema.literals
    );
    expect(ContractEndReasonSchema.literals).toStrictEqual(
      FollowUpEndReasonSchema.literals
    );
    expect(ContractStatusSchema.literals).toStrictEqual(
      FollowUpStatusSchema.members.map(
        ({ fields }) => fields._tag.schema.literal
      )
    );
    // Every ability the contract names is one the server answers, and the
    // server answers no other.
    const isAbility = Schema.is(AbilitySchema);

    expect(FollowUpAbilitySchema.literals.every(isAbility)).toBeTruthy();
    expect(
      [
        ...FollowUpBlockerSchema.literals,
        "available",
        "notAsked",
        "turnedOff",
        "reconnect",
        "notCounted",
        "textTooLong",
      ].toSorted()
    ).toStrictEqual([...FollowUpAbilitySchema.literals].toSorted());
  });

  it("says until when a follow-up waits for its channel", () => {
    const waiting = waitFollowUp(
      {
        channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000101"),
        id: FollowUpIdSchema.make("00000000-0000-7000-8000-000000000401"),
        kind: "repost",
        postId: PostIdSchema.make("00000000-0000-7000-8000-000000000201"),
        ruleId: FollowUpRuleIdSchema.make(
          "00000000-0000-7000-8000-000000000301"
        ),
        targetId: PostTargetIdSchema.make(
          "00000000-0000-7000-8000-000000000501"
        ),
        until: DateTime.makeUnsafe("2026-07-13T07:00:00Z"),
        workspaceId: WorkspaceIdSchema.make(
          "00000000-0000-7000-8000-000000000601"
        ),
      },
      DateTime.makeUnsafe("2026-07-06T07:00:00Z")
    );

    const shown = followUpView(waiting);

    expect(shown.status).toBe("waiting");
    expect(shown.until).toStrictEqual(
      DateTime.makeUnsafe("2026-07-13T07:00:00Z")
    );
  });
});
