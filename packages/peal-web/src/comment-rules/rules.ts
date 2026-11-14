import { maxKeywords } from "peal-contract";
import type { NewCommentRule } from "peal-contract";

/** What the form holds while a member writes a rule. */
export interface CommentRuleDraft {
  readonly channelId: string;
  /** Comma-separated, as a member types them. */
  readonly keywords: string;
  readonly reply: string;
}

export const freshCommentRule: CommentRuleDraft = {
  channelId: "",
  keywords: "",
  reply: "",
};

/** The keywords a member typed, comma-separated, each trimmed. */
export const keywordsTyped = (typed: string): readonly string[] =>
  typed.split(",").flatMap((keyword) => {
    const kept = keyword.trim();

    return kept.length > 0 ? [kept] : [];
  });

/**
 * The request the form sends, or why not: no channel (`channel`), no
 * keyword or too many (`keywords`), no reply (`reply`). The server checks
 * the rest.
 */
export const commentRuleRequestOf = (
  draft: CommentRuleDraft
): NewCommentRule | "channel" | "keywords" | "reply" => {
  const keywords = keywordsTyped(draft.keywords);

  if (draft.channelId.length === 0) {
    return "channel";
  }

  if (keywords.length === 0 || keywords.length > maxKeywords) {
    return "keywords";
  }

  if (draft.reply.trim().length === 0) {
    return "reply";
  }

  return { channelId: draft.channelId, keywords, reply: draft.reply.trim() };
};
