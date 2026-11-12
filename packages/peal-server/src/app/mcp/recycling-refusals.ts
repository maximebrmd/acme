import { Effect, Option, Schema } from "effect";
import type { RecyclingVariant as VariantInput } from "peal-contract";

import { notAllowed, refuse } from "#app/mcp/refusals.ts";
import { RecyclingRuleIdSchema } from "#publishing/domain/recycling-rule-id.ts";
import { RecyclingVariantsSchema } from "#publishing/domain/recycling-rule.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

// What the recycling tools take and are refused with, in words the user
// acts on, shared by the saved and the posts toolkits.

const decodeRuleId = Schema.decodeUnknownOption(RecyclingRuleIdSchema);

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

const decodeVariants = Schema.decodeUnknownEffect(RecyclingVariantsSchema);

export const noRule = () =>
  refuse(
    "The workspace has no recycling rule with this id: list_recycling_rules answers its rules."
  );

/** The rule a call names, or a refusal: a malformed id names none. */
export const ruleIdFrom = (raw: string) =>
  Option.match(decodeRuleId(raw), {
    onNone: noRule,
    onSome: (id) => Effect.succeed(id),
  });

/** A day the tool's schema checked, as the domain reads it. */
export const dateOf = (day: string): LocalDate => {
  const [year = 0, month = 0, dayOfMonth = 0] = day.split("-").map(Number);

  return { day: dayOfMonth, month, year };
};

/**
 * The variants a call gives, their texts on channels that are not even
 * channel ids left out, as they name none the post goes to.
 */
export const variantsFrom = (variants: readonly VariantInput[]) =>
  decodeVariants(
    variants.map(({ overrides = [], text }) => ({
      overrides: overrides.filter(({ channelId }) =>
        Option.isSome(decodeChannelId(channelId))
      ),
      text,
    }))
  ).pipe(Effect.orDie);

const endsTooSoon = () =>
  refuse(
    "The rule's `until` or `count` leaves no post to make: the next would be due after it. Nothing was changed."
  );

const variantsRejected = ({
  variants,
}: {
  readonly variants: readonly {
    readonly variant: number;
    readonly violations: readonly { readonly _tag: string }[];
  }[];
}) =>
  refuse(
    `Some variants break the rules of the source post's channels, and nothing was saved. Fix every violation of each variant (by its place, from 1), then call again: ${JSON.stringify(variants)}`
  );

const ended = ({ reason }: { readonly reason: string }) =>
  refuse(
    `The rule ended (${reason}) and changes no more: resume_recycling_rule sets it going again when it ended for planLimit, contentRejected, noChannels, queueFull or sourceWithdrawn (once its post is scheduled again); recycle_post starts a new one otherwise.`
  );

/** How changing a rule is refused. */
export const changeRefusals = {
  DatabaseError: Effect.die,
  MissingPermission: notAllowed("change recycling rules"),
  PostNotFound: () =>
    refuse("The rule's source post is gone: the rule ends at its next run."),
  RecyclingEndsTooSoon: endsTooSoon,
  RecyclingRuleEnded: ended,
  RecyclingRuleNotFound: noRule,
  RecyclingVariantsRejected: variantsRejected,
} as const;

/** How starting a rule is refused. */
export const startRefusals = {
  DatabaseError: Effect.die,
  MissingPermission: notAllowed("schedule or publish posts"),
  PostNotFound: () =>
    refuse(
      "The workspace has no post with this id: list_posts answers its posts."
    ),
  PostNotRecyclable: ({ reason }: { readonly reason: string }) =>
    refuse(
      `This post cannot repeat (${reason}): a draft, a post awaiting approval or cancelled, one another rule repeats (list_recycling_rules), one a rule made, or one with no channel left is refused. Schedule it first, or stop the other rule.`
    ),
  QueueNotFound: () =>
    refuse(
      "The workspace has no queue with this id: list_queues answers its queues."
    ),
  RecyclingEndsTooSoon: endsTooSoon,
  RecyclingVariantsRejected: variantsRejected,
  TooManyRecyclingRules: ({ allowed }: { readonly allowed: number }) =>
    refuse(
      `The workspace has ${String(allowed)} recycling rules going, the most it may: stop one first, with stop_recycling_rule.`
    ),
} as const;
