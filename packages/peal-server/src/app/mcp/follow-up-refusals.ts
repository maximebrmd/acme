import { Effect, Option, Schema } from "effect";
import type { FollowUpRefusal } from "peal-contract";

import { refuse } from "#app/mcp/refusals.ts";
import type { FollowUpNotPossible } from "#publishing/application/follow-up-not-possible.ts";
import { FollowUpRuleIdSchema } from "#publishing/domain/follow-up-rule-id.ts";

// What the follow-up tools are refused with, in words the user acts on.

const decodeRuleId = Schema.decodeUnknownOption(FollowUpRuleIdSchema);

export const noFollowUpRule = () =>
  refuse(
    "The workspace has no follow-up rule with this id: list_follow_up_rules answers its rules."
  );

/** The rule a call names, or a refusal: a malformed id names none. */
export const followUpRuleIdFrom = (raw: string) =>
  Option.match(decodeRuleId(raw), {
    onNone: noFollowUpRule,
    onSome: (id) => Effect.succeed(id),
  });

const refusals: Readonly<Record<FollowUpRefusal, string>> = {
  channels:
    "No channel can carry what the rule asks, or its comment is longer than one that could takes. Nothing was saved. Each channel, kind by kind",
  emptyComment: "The comment is empty: give it some text, or leave it out.",
  noAction: "The rule does nothing: give a comment, repost, or both.",
  noChannel:
    "The rule acts on no channel of the workspace: give a post of the workspace or one of its channels.",
  alreadyFollowedUp:
    "Another rule already follows the post up this way: stop it first.",
  postCancelled: "The post was cancelled: nothing of it can be followed up.",
};

/** A rule refused, with what each channel can carry, as JSON. */
export const notPossible = ({ channels, reason }: FollowUpNotPossible) =>
  refuse(
    channels.length === 0
      ? refusals[reason]
      : `${refusals[reason]}: ${JSON.stringify(channels)}`
  );

export const ruleTaken = ({ ruleId }: { readonly ruleId: string }) =>
  refuse(
    `Follow-up rule ${ruleId} already acts on this post or channel: change it with update_follow_up_rule, or stop it first.`
  );

export const ruleEnded = ({ reason }: { readonly reason: string }) =>
  refuse(
    `The follow-up rule ended (${reason}) and changes no more: start_follow_up_rule starts another.`
  );
