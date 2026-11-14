import { Option } from "effect";
import type { FollowUpRule, NewFollowUpRule } from "peal-contract";

/** What the form holds while a member writes a rule. */
export interface FollowUpDraft {
  readonly comment: string;
  readonly likes: string;
  readonly repost: boolean;
}

export const freshFollowUp: FollowUpDraft = {
  comment: "",
  likes: "50",
  repost: false,
};

const likesPattern = /^\d{1,7}$/u;

/**
 * The request the form sends for a post, or why not: likes that are not a
 * whole number (`likes`), or nothing to do (`nothing`). The server checks
 * the rest.
 */
export const followUpRequestOf = (
  postId: string,
  draft: FollowUpDraft
): Option.Option<NewFollowUpRule> | "likes" | "nothing" => {
  const comment = draft.comment.trim();

  if (!likesPattern.test(draft.likes.trim())) {
    return "likes";
  }

  if (comment.length === 0 && !draft.repost) {
    return "nothing";
  }

  const likes = Number(draft.likes.trim());

  return Option.some(
    comment.length === 0
      ? { likes, postId, repost: draft.repost }
      : { comment, likes, postId, repost: draft.repost }
  );
};

/** The rule of a post that has not ended, if one has. */
export const ruleOfPost = (
  rules: readonly FollowUpRule[],
  postId: string
): FollowUpRule | undefined =>
  rules.find((rule) => rule.postId === postId && rule.status !== "ended");
