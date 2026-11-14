import { describe, expect, it } from "@effect/vitest";
import { Duration, Schema } from "effect";
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

import {
  followUpsShown,
  maxFollowUpCommentLength,
} from "#publishing/application/follow-up-rules.ts";
import { FollowUpAbilitySchema as AbilitySchema } from "#publishing/domain/follow-up-ability.ts";
import { FollowUpEndReasonSchema } from "#publishing/domain/follow-up-end-reason.ts";
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
} from "#publishing/domain/follow-up.ts";

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
});
