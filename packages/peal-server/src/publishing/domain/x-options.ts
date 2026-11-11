import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid, missing } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";

// X's POST /2/tweets (its OpenAPI document, version 2.174, and the
// changelog, read 2026-11-11): `reply_settings`, `community_id`,
// `share_with_followers`, `paid_partnership` and `made_with_ai`, under the
// scopes Peal holds. Who may reply, the community and sharing it with
// followers are the thread's first post's: replies never carry them. The
// two disclosures label every part, the AI one only a part with media.

/**
 * Who may reply, besides the author: "Who can reply to this tweet."
 * Left out, everyone.
 */
export const XReplySettingsSchema = Schema.Literals([
  "following",
  "mentionedUsers",
  "subscribers",
  "verified",
]);

export type XReplySettings = typeof XReplySettingsSchema.Type;

// A community's id, as X's document gives its pattern.
const communityIdPattern = /^[0-9]{1,19}$/u;

// What X would refuse in a target's options.
const xProblems = (options: XOptions): readonly OptionProblem<XField>[] => [
  ...(options.communityId === undefined ||
  communityIdPattern.test(options.communityId)
    ? []
    : [invalid("communityId")]),
  // Sharing with followers is sharing a community post.
  ...(options.shareWithFollowers === true && options.communityId === undefined
    ? [missing("communityId")]
    : []),
];

/**
 * How a post goes out on an X account. Nothing is needed: left out,
 * everyone may reply, the post goes to the account's followers rather than
 * a community, and it discloses nothing. `shareWithFollowers` also shows a
 * community post (`communityId`) on the followers' timelines.
 */
export class XOptions extends Schema.Class<XOptions>(
  "peal-server/publishing/domain/XOptions"
)({
  communityId: Schema.optionalKey(PostTextSchema),
  // "Disclose that the tweet contains AI-generated media."
  madeWithAi: Schema.optionalKey(Schema.Boolean),
  // "the Post will be labeled as a paid promotion."
  paidPartnership: Schema.optionalKey(Schema.Boolean),
  platform: Schema.tag("x"),
  replySettings: Schema.optionalKey(XReplySettingsSchema),
  shareWithFollowers: Schema.optionalKey(Schema.Boolean),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<Record<XField, FieldNotes<LookupName>>> = {
    communityId: { pattern: communityIdPattern.source },
    madeWithAi: { ifLeftOut: false },
    paidPartnership: { ifLeftOut: false },
    replySettings: {},
    shareWithFollowers: { ifLeftOut: false },
  };

  /** Sharing with followers needs the community it shares from. */
  static readonly constraints: readonly OptionConstraint<XField>[] = [
    {
      _tag: "neededWith",
      field: "communityId",
      other: "shareWithFollowers",
      values: ["true"],
    },
  ];

  /** What X would refuse in them. */
  problems(): readonly OptionProblem<XField>[] {
    return xProblems(this);
  }
}

/** An option of X's. */
export type XField = Exclude<keyof typeof XOptions.fields, "platform">;
