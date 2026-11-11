import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";
import { measureText } from "./text-length.ts";

// Meta's Threads API, POST /{threads-user-id}/threads (the "Posts" page and
// the publishing reference, read 2026-11-11): `reply_control`, `topic_tag`
// and `link_attachment`, on the container that publishes, with the
// `threads_content_publish` permission Peal holds.

/** The longest topic Threads takes: "no more than 50 characters long". */
export const maxThreadsTopicTagLength = 50;

/** The longest link Peal takes: Peal's ceiling, as Threads names none. */
export const maxThreadsLinkLength = 2048;

/** Who may reply to the post: "one of the five options". */
export const ThreadsReplyControlSchema = Schema.Literals([
  "everyone",
  "accounts_you_follow",
  "mentioned_only",
  "parent_post_author_only",
  "followers_only",
]);

export type ThreadsReplyControl = typeof ThreadsReplyControlSchema.Type;

// "Periods (.)" and "Ampersands (&)" are not allowed in a topic tag, which
// is one line, as the app writes it.
const topicForbidden = [".", "&", "\n", "\r"] as const;

// An address shown as the post's link preview: https only, as Peal sends
// it. Written without a flag, so the pattern clients are told (its source)
// is the rule itself: the scheme in either case.
const secureAddress = /^[Hh][Tt][Tt][Pp][Ss]:\/\/\S+$/u;

const tooLong = (
  field: ThreadsField,
  text: string | undefined,
  maximum: number
): readonly OptionProblem<ThreadsField>[] => {
  const length = measureText(text ?? "", "codePoints");

  return length > maximum ? [{ _tag: "tooLong", field, length, maximum }] : [];
};

// What Threads would refuse in a target's options. A link attachment on a
// post with media is refused where the media is known (`content-rules.ts`).
const threadsProblems = (
  options: ThreadsOptions
): readonly OptionProblem<ThreadsField>[] => [
  ...(options.topicTag !== undefined &&
  (options.topicTag.trim() === "" ||
    topicForbidden.some((character) =>
      (options.topicTag ?? "").includes(character)
    ))
    ? [invalid("topicTag")]
    : []),
  ...tooLong("topicTag", options.topicTag, maxThreadsTopicTagLength),
  ...(options.linkAttachment === undefined ||
  secureAddress.test(options.linkAttachment)
    ? []
    : [invalid("linkAttachment")]),
  ...tooLong("linkAttachment", options.linkAttachment, maxThreadsLinkLength),
];

/**
 * How a post goes out on a Threads account. Nothing is needed: left out,
 * everyone may reply, the post has no topic, and Threads previews the
 * first link of a post of text alone. `linkAttachment` is "only available
 * for text-only posts".
 */
export class ThreadsOptions extends Schema.Class<ThreadsOptions>(
  "peal-server/publishing/domain/ThreadsOptions"
)({
  linkAttachment: Schema.optionalKey(PostTextSchema),
  platform: Schema.tag("threads"),
  replyControl: Schema.optionalKey(ThreadsReplyControlSchema),
  topicTag: Schema.optionalKey(PostTextSchema),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<
    Record<ThreadsField, FieldNotes<LookupName>>
  > = {
    linkAttachment: {
      maxLength: maxThreadsLinkLength,
      pattern: secureAddress.source,
    },
    replyControl: { ifLeftOut: "everyone" },
    topicTag: {
      forbiddenCharacters: topicForbidden,
      maxLength: maxThreadsTopicTagLength,
    },
  };

  /** No rule ties two of Threads' options together. */
  static readonly constraints: readonly OptionConstraint<ThreadsField>[] = [];

  /** What Threads would refuse in them. */
  problems(): readonly OptionProblem<ThreadsField>[] {
    return threadsProblems(this);
  }
}

/** An option of Threads'. */
export type ThreadsField = Exclude<
  keyof typeof ThreadsOptions.fields,
  "platform"
>;
