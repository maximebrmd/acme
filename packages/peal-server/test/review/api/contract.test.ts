import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";
import {
  ApprovalOriginSchema,
  ApprovalPolicySchema,
  ApprovalStatusSchema,
  CommentProblemSchema,
  defaultReviewLinkHours,
  maxCommentLength,
  maxQuoteLength,
  maxReviewLinkHours,
  maxReviewLinksPerPost,
  maxVisitorNameLength,
  ReviewLinkAccessSchema,
  ReviewLinkClosureSchema,
} from "peal-contract";

import { CommentProblemSchema as DomainProblems } from "#review/application/comment-rejected.ts";
import { LinkClosureSchema } from "#review/application/link-closed.ts";
import { maxActiveLinksPerPost } from "#review/application/review-links.ts";
import { ApprovalPolicySchema as DomainPolicies } from "#review/domain/approval-policy.ts";
import {
  RequestOriginSchema,
  RequestStatusSchema,
} from "#review/domain/approval-request.ts";
import * as text from "#review/domain/plain-text.ts";
import {
  defaultLinkLifetime,
  LinkAccessSchema,
  maxLinkLifetime,
} from "#review/domain/review-link.ts";

// The contract copies what the review context's domain lists and limits,
// so clients check before they send: both must say the same.

describe("the review contract", () => {
  it("lists the policies, accesses, statuses and refusals the domain has", () => {
    expect([
      ApprovalPolicySchema.literals,
      ReviewLinkAccessSchema.literals,
      ApprovalStatusSchema.literals,
      ApprovalOriginSchema.literals,
      ReviewLinkClosureSchema.literals,
    ]).toStrictEqual([
      DomainPolicies.literals,
      LinkAccessSchema.literals,
      RequestStatusSchema.literals,
      RequestOriginSchema.literals,
      LinkClosureSchema.literals,
    ]);
    expect(CommentProblemSchema.literals).toStrictEqual(
      DomainProblems.literals
    );
  });

  it("limits what people type as the domain does", () => {
    expect({
      maxCommentLength,
      maxQuoteLength,
      maxVisitorNameLength,
    }).toStrictEqual({
      maxCommentLength: text.maxCommentLength,
      maxQuoteLength: text.maxQuoteLength,
      maxVisitorNameLength: text.maxVisitorNameLength,
    });
  });

  it("gives links the lifetimes and the number the domain allows", () => {
    expect({
      default: Duration.hours(defaultReviewLinkHours),
      max: Duration.hours(maxReviewLinkHours),
      perPost: maxReviewLinksPerPost,
    }).toStrictEqual({
      default: defaultLinkLifetime,
      max: maxLinkLifetime,
      perPost: maxActiveLinksPerPost,
    });
  });
});
