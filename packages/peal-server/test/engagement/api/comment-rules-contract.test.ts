import { describe, expect, it } from "@effect/vitest";
import {
  CommentRuleAbilitySchema as ContractAbilitySchema,
  CommentRuleEndReasonSchema as ContractEndReasonSchema,
  maxChannelRepliesPerDay as contractPerChannelDay,
  maxCommentRulesPerWorkspace as contractRules,
  maxKeywordLength as contractKeywordLength,
  maxKeywords as contractKeywords,
  maxRuleRepliesPerDay as contractPerDay,
  commentRuleMatchesShown as contractShown,
} from "peal-contract";

import {
  CommentRuleAbilitySchema,
  matchesShown,
} from "#engagement/application/comment-rules.ts";
import { CommentRuleEndReasonSchema } from "#engagement/domain/comment-rule-end-reason.ts";
import {
  maxChannelRepliesPerDay,
  maxCommentRulesPerWorkspace,
  maxKeywordLength,
  maxKeywords,
  maxRuleRepliesPerDay,
} from "#engagement/domain/comment-rule.ts";

// The contract's copy of comment rules' limits and words, which clients
// read: equal to the server's.

describe("the comment rules' contract", () => {
  it("copies the server's limits and words", () => {
    expect({
      keywordLength: contractKeywordLength,
      keywords: contractKeywords,
      perChannelDay: contractPerChannelDay,
      perDay: contractPerDay,
      rules: contractRules,
      shown: contractShown,
    }).toStrictEqual({
      keywordLength: maxKeywordLength,
      keywords: maxKeywords,
      perChannelDay: maxChannelRepliesPerDay,
      perDay: maxRuleRepliesPerDay,
      rules: maxCommentRulesPerWorkspace,
      shown: matchesShown,
    });
    expect(ContractAbilitySchema.literals).toStrictEqual(
      CommentRuleAbilitySchema.literals
    );
    expect(ContractEndReasonSchema.literals).toStrictEqual(
      CommentRuleEndReasonSchema.literals
    );
  });
});
