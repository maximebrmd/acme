import { DateTime, Option, Result, Schema } from "effect";

import {
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { PostId, UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import { LocalDateSchema, localDateOf } from "#shared/domain/wall-clock.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import { PostOriginSchema } from "./post-origin.ts";
import type { PostOrigin } from "./post-origin.ts";
import { QueueIdSchema } from "./queue-id.ts";
import type { QueueId } from "./queue-id.ts";
import { RecyclingEndReasonSchema } from "./recycling-end-reason.ts";
import type { RecyclingEndReason } from "./recycling-end-reason.ts";
import { RecyclingEndsTooSoon } from "./recycling-ends-too-soon.ts";
import { nextDueAfter, RecyclingIntervalSchema } from "./recycling-interval.ts";
import type { RecyclingInterval } from "./recycling-interval.ts";
import { RecyclingRuleEnded } from "./recycling-rule-ended.ts";
import { RecyclingRuleIdSchema } from "./recycling-rule-id.ts";
import type { RecyclingRuleId } from "./recycling-rule-id.ts";
import { RecyclingVariant } from "./recycling-variant.ts";

// The limits below are the owner's to change: each is written once here,
// and the contract's copy is kept equal by a test.

/** The most rules a workspace keeps active or paused, whatever its plan. */
export const maxRecyclingRulesPerWorkspace = 100;

/**
 * The most occurrences a rule makes, its source counted: the ceiling of a
 * `count`, and where a rule with no ending stops.
 */
export const maxOccurrences = 100;

/** The fewest occurrences a `count` asks for: the source and one more. */
export const minOccurrences = 2;

/** The most text variants a rule takes turns with. */
export const maxRecyclingVariants = 10;

export const RecyclingVariantsSchema = Schema.Array(RecyclingVariant).check(
  Schema.isMaxLength(maxRecyclingVariants)
);

/**
 * The reasons a member is told of, as a notice: those that stop what they
 * expect to go on. A rule that made all it was asked for, or that a
 * member stopped, ends as they meant it to.
 */
export const isToldEnd = (reason: RecyclingEndReason): boolean =>
  reason !== "completed" && reason !== "stopped";

/**
 * The reasons a rule may be resumed after: what a member can put right
 * (room in the plan, the variants, a channel connected again, a queue's
 * slots) without starting over.
 */
export const resumableReasons: ReadonlySet<RecyclingEndReason> = new Set([
  "contentRejected",
  "noChannels",
  "planLimit",
  "queueFull",
]);

/** Where a rule is: making occurrences, paused by a member, or ended. */
export const RecyclingStatusSchema = Schema.Union([
  Schema.TaggedStruct("active", {}),
  Schema.TaggedStruct("paused", { pausedAt: Schema.DateTimeUtc }),
  Schema.TaggedStruct("ended", {
    endedAt: Schema.DateTimeUtc,
    reason: RecyclingEndReasonSchema,
  }),
]);

export type RecyclingStatus = typeof RecyclingStatusSchema.Type;

/**
 * A recycling rule: it makes a source post repeat, a new post one interval
 * after the one before, at the same wall-clock time in the source's zone
 * (`./recycling-interval.ts`), or on a queue's first free slot from then,
 * until it has made `count` occurrences, its source counted, or until the
 * date `until`, and never more than `maxOccurrences`. Occurrence n says
 * what the source says, or the variant whose turn it is (`variantFor`).
 *
 * There is at most one occurrence ahead: the next is made once the latest
 * one's time (`lastDueAt`) has passed, for `nextDueAt`. `made` counts the
 * occurrences made, the source as the first. `anchorAt` is the source's
 * time, which every due instant is counted from.
 *
 * Each occurrence acts as whoever started the rule, with what they may do
 * when it is made: `startedBy` is the member (none for a key) and
 * `startedVia` how they reached Peal, as a post keeps it. `resumptions`
 * counts the times it was resumed after it ended, which names the notice
 * of its next end.
 */
export class RecyclingRule extends Schema.Class<RecyclingRule>(
  "peal-server/publishing/domain/RecyclingRule"
)({
  anchorAt: Schema.DateTimeUtc,
  count: Schema.Option(Schema.Int),
  createdAt: Schema.DateTimeUtc,
  id: RecyclingRuleIdSchema,
  interval: RecyclingIntervalSchema,
  lastDueAt: Schema.DateTimeUtc,
  made: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  nextDueAt: Schema.Option(Schema.DateTimeUtc),
  queueId: Schema.Option(QueueIdSchema),
  resumptions: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  sourcePostId: PostIdSchema,
  startedBy: Schema.Option(UserIdSchema),
  startedVia: PostOriginSchema,
  status: RecyclingStatusSchema,
  timeZone: TimeZoneIdSchema,
  until: Schema.Option(LocalDateSchema),
  variants: RecyclingVariantsSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/** How a rule ends: after so many occurrences, on a date, or neither. */
export interface RecyclingEnding {
  readonly count: Option.Option<number>;
  readonly until: Option.Option<LocalDate>;
}

/** What starts a rule. */
export interface NewRecyclingRule extends RecyclingEnding {
  /** The source's time, which every due instant is counted from. */
  readonly anchorAt: DateTime.Utc;
  readonly id: RecyclingRuleId;
  readonly interval: RecyclingInterval;
  readonly queueId: Option.Option<QueueId>;
  readonly sourcePostId: PostId;
  readonly startedBy: Option.Option<UserId>;
  readonly startedVia: PostOrigin;
  readonly timeZone: TimeZoneId;
  readonly variants: readonly RecyclingVariant[];
  readonly workspaceId: WorkspaceId;
}

const isAfter = (left: LocalDate, right: LocalDate): boolean =>
  left.year * 10_000 + left.month * 100 + left.day >
  right.year * 10_000 + right.month * 100 + right.day;

// Whether an occurrence due at `at`, the `number`-th, is one the rule
// still makes.
const within = (
  { count, timeZone, until }: RecyclingEnding & { timeZone: TimeZoneId },
  number: number,
  at: DateTime.Utc
): boolean =>
  number <= Option.getOrElse(count, () => maxOccurrences) &&
  number <= maxOccurrences &&
  Option.match(until, {
    onNone: () => true,
    onSome: (last) => !isAfter(localDateOf(at, timeZone), last),
  });

const later = (left: DateTime.Utc, right: DateTime.Utc) =>
  DateTime.isGreaterThan(left, right) ? left : right;

type RuleFields = ConstructorParameters<typeof RecyclingRule>[0];

const changed = (
  rule: RecyclingRule,
  fields: Partial<RuleFields>
): RecyclingRule => {
  const current: RuleFields = {
    anchorAt: rule.anchorAt,
    count: rule.count,
    createdAt: rule.createdAt,
    id: rule.id,
    interval: rule.interval,
    lastDueAt: rule.lastDueAt,
    made: rule.made,
    nextDueAt: rule.nextDueAt,
    queueId: rule.queueId,
    resumptions: rule.resumptions,
    sourcePostId: rule.sourcePostId,
    startedBy: rule.startedBy,
    startedVia: rule.startedVia,
    status: rule.status,
    timeZone: rule.timeZone,
    until: rule.until,
    variants: rule.variants,
    workspaceId: rule.workspaceId,
  };

  return new RecyclingRule({ ...current, ...fields });
};

/**
 * A new rule, its source the first occurrence: the next is due one
 * interval after the source's time, or after now when that has passed.
 * RecyclingEndsTooSoon when its ending leaves no occurrence to make.
 */
export const startRule = (
  rule: NewRecyclingRule,
  now: DateTime.Utc
): Result.Result<RecyclingRule, RecyclingEndsTooSoon> => {
  const next = nextDueAfter(
    rule.interval,
    rule.anchorAt,
    rule.timeZone,
    later(rule.anchorAt, now)
  );

  if (!within(rule, 2, next)) {
    return Result.fail(new RecyclingEndsTooSoon({ firstDueAt: next }));
  }

  return Result.succeed(
    new RecyclingRule({
      ...rule,
      createdAt: now,
      lastDueAt: rule.anchorAt,
      made: 1,
      nextDueAt: Option.some(next),
      resumptions: 0,
      status: { _tag: "active" },
    })
  );
};

/** Whether the rule's next occurrence is to be made now. */
export const isDue = (rule: RecyclingRule, now: DateTime.Utc): boolean =>
  rule.status._tag === "active" &&
  Option.isSome(rule.nextDueAt) &&
  !DateTime.isGreaterThan(rule.lastDueAt, now);

/**
 * When the next occurrence goes out: the instant planned, or, when the
 * server missed it, the next due instant after now; never a burst of
 * missed occurrences.
 */
export const plannedAt = (
  rule: RecyclingRule,
  now: DateTime.Utc
): DateTime.Utc => {
  const planned = Option.getOrElse(rule.nextDueAt, () => now);

  return DateTime.isGreaterThan(planned, now)
    ? planned
    : nextDueAfter(rule.interval, rule.anchorAt, rule.timeZone, now);
};

/**
 * The variant occurrence `number` says, from 1: none for the source's
 * text, which the first says, then each variant in turn, then the
 * source's again, and so on.
 */
export const variantFor = (
  rule: Pick<RecyclingRule, "variants">,
  number: number
): Option.Option<RecyclingVariant> => {
  const turn = (number - 1) % (rule.variants.length + 1);

  return turn === 0
    ? Option.none()
    : Option.fromUndefinedOr(rule.variants[turn - 1]);
};

/**
 * The rule once an occurrence was made, due at `dueAt` and going out at
 * `at` (a queue's slot may be later): it counts, and the next is due one
 * interval after `dueAt`, or the rule ends `completed` when that one is
 * past its ending.
 */
export const occurrenceMade = (
  rule: RecyclingRule,
  dueAt: DateTime.Utc,
  at: DateTime.Utc,
  now: DateTime.Utc
): RecyclingRule => {
  const made = rule.made + 1;
  const next = nextDueAfter(rule.interval, rule.anchorAt, rule.timeZone, dueAt);

  return within(rule, made + 1, next)
    ? changed(rule, { lastDueAt: at, made, nextDueAt: Option.some(next) })
    : changed(rule, {
        lastDueAt: at,
        made,
        nextDueAt: Option.none(),
        status: { _tag: "ended", endedAt: now, reason: "completed" },
      });
};

/** Ends the rule: an ended rule stays as it ended. */
export const endRule = (
  rule: RecyclingRule,
  reason: RecyclingEndReason,
  now: DateTime.Utc
): RecyclingRule =>
  rule.status._tag === "ended"
    ? rule
    : changed(rule, {
        nextDueAt: Option.none(),
        status: { _tag: "ended", endedAt: now, reason },
      });

/** Pauses an active rule; a paused one stays so. */
export const pauseRule = (
  rule: RecyclingRule,
  now: DateTime.Utc
): Result.Result<RecyclingRule, RecyclingRuleEnded> => {
  if (rule.status._tag === "ended") {
    return Result.fail(
      new RecyclingRuleEnded({ reason: rule.status.reason, ruleId: rule.id })
    );
  }

  return Result.succeed(
    rule.status._tag === "paused"
      ? rule
      : changed(rule, { status: { _tag: "paused", pausedAt: now } })
  );
};

/**
 * Sets a paused rule going again, or one that ended for a reason a member
 * can put right (`resumableReasons`): its next occurrence is due at the
 * first due instant after now and after its latest one. An active rule
 * stays as it is. RecyclingEndsTooSoon when its ending leaves nothing to
 * make, RecyclingRuleEnded for any other ended rule.
 */
export const resumeRule = (
  rule: RecyclingRule,
  now: DateTime.Utc
): Result.Result<RecyclingRule, RecyclingEndsTooSoon | RecyclingRuleEnded> => {
  const { status } = rule;

  if (status._tag === "active") {
    return Result.succeed(rule);
  }

  if (status._tag === "ended" && !resumableReasons.has(status.reason)) {
    return Result.fail(
      new RecyclingRuleEnded({ reason: status.reason, ruleId: rule.id })
    );
  }

  const next =
    status._tag === "paused" &&
    Option.exists(rule.nextDueAt, (at) => DateTime.isGreaterThan(at, now))
      ? Option.getOrThrow(rule.nextDueAt)
      : nextDueAfter(
          rule.interval,
          rule.anchorAt,
          rule.timeZone,
          later(rule.lastDueAt, now)
        );

  if (!within(rule, rule.made + 1, next)) {
    return Result.fail(new RecyclingEndsTooSoon({ firstDueAt: next }));
  }

  return Result.succeed(
    changed(rule, {
      nextDueAt: Option.some(next),
      resumptions:
        status._tag === "ended" ? rule.resumptions + 1 : rule.resumptions,
      status: { _tag: "active" },
    })
  );
};

/** What a member changes of a rule: each left out stays as it was. */
export interface RecyclingChange {
  readonly count?: Option.Option<number>;
  readonly until?: Option.Option<LocalDate>;
  readonly variants?: readonly RecyclingVariant[];
}

/**
 * The rule with its variants or its ending changed. An ended rule changes
 * no more (RecyclingRuleEnded), but through `resumeRule`; an ending that
 * leaves out the occurrence already planned is RecyclingEndsTooSoon.
 */
export const editRule = (
  rule: RecyclingRule,
  change: RecyclingChange
): Result.Result<RecyclingRule, RecyclingEndsTooSoon | RecyclingRuleEnded> => {
  if (rule.status._tag === "ended") {
    return Result.fail(
      new RecyclingRuleEnded({ reason: rule.status.reason, ruleId: rule.id })
    );
  }

  const edited = changed(rule, {
    count: change.count ?? rule.count,
    until: change.until ?? rule.until,
    variants: change.variants ?? rule.variants,
  });

  return Option.match(edited.nextDueAt, {
    onNone: () => Result.succeed(edited),
    onSome: (next) =>
      within(edited, edited.made + 1, next)
        ? Result.succeed(edited)
        : Result.fail(new RecyclingEndsTooSoon({ firstDueAt: next })),
  });
};

/**
 * The rule's next `count` due instants, for its page: computed, never
 * stored, from the one planned, within its ending. None for a rule that
 * is not active or paused.
 */
export const comingDue = (
  rule: RecyclingRule,
  now: DateTime.Utc,
  count: number
): readonly { readonly at: DateTime.Utc; readonly occurrence: number }[] => {
  if (rule.status._tag === "ended" || Option.isNone(rule.nextDueAt)) {
    return [];
  }

  const coming: { readonly at: DateTime.Utc; readonly occurrence: number }[] =
    [];

  let at = plannedAt(rule, now);
  let occurrence = rule.made + 1;

  while (coming.length < count && within(rule, occurrence, at)) {
    coming.push({ at, occurrence });
    at = nextDueAfter(rule.interval, rule.anchorAt, rule.timeZone, at);
    occurrence += 1;
  }

  return coming;
};
