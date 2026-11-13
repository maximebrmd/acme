import {
  Array as Arr,
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  Schema,
} from "effect";

import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import type { RecyclingEndReason } from "#publishing/domain/recycling-end-reason.ts";
import type { RecyclingEndsTooSoon } from "#publishing/domain/recycling-ends-too-soon.ts";
import type { RecyclingInterval } from "#publishing/domain/recycling-interval.ts";
import type { RecyclingRuleEnded } from "#publishing/domain/recycling-rule-ended.ts";
import { RecyclingRuleIdSchema } from "#publishing/domain/recycling-rule-id.ts";
import type { RecyclingRuleId } from "#publishing/domain/recycling-rule-id.ts";
import {
  comingDue,
  editRule,
  endRule,
  isDue,
  isWithinEnding,
  maxRecyclingRulesPerWorkspace,
  occurrenceMade,
  pauseRule,
  plannedAt,
  RecyclingRule,
  resumeRule,
  startRule,
  variantFor,
} from "#publishing/domain/recycling-rule.ts";
import type {
  RecyclingChange,
  RecyclingStatus,
} from "#publishing/domain/recycling-rule.ts";
import {
  mediaWithoutTextOf,
  sayingVariant,
} from "#publishing/domain/recycling-variant.ts";
import type { RecyclingVariant } from "#publishing/domain/recycling-variant.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

import type { AccountRules } from "./account-rules.ts";
import type { AttachableMedia } from "./attachable-media.ts";
import { LeftForNextRun } from "./left-for-next-run.ts";
import { queueNamed } from "./placement.ts";
import { copyOf } from "./post-copies.ts";
import type { PostCopy } from "./post-copies.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostNotRecyclable } from "./post-not-recyclable.ts";
import { PostOrigins } from "./post-origins.ts";
import { channelsFor, mediaFor } from "./post-references.ts";
import { PostRepository } from "./post-repository.ts";
import { PostScheduling } from "./post-scheduling.ts";
import { violationsOf } from "./publishability.ts";
import type { QueueNotFound } from "./queue-not-found.ts";
import type { QueueStore } from "./queue-store.ts";
import { RecyclingActors } from "./recycling-actors.ts";
import { RecyclingEndingPassed } from "./recycling-ending-passed.ts";
import { RecyclingNotices } from "./recycling-notices.ts";
import { RecyclingRuleNotFound } from "./recycling-rule-not-found.ts";
import { RecyclingStore } from "./recycling-store.ts";
import { RecyclingVariantsRejected } from "./recycling-variants-rejected.ts";
import { mayChangeStarted, notImpersonating, starterOf } from "./started-by.ts";
import type { TagStore } from "./tag-store.ts";
import { TooManyRecyclingRules } from "./too-many-recycling-rules.ts";
import type { WorkspaceChannels } from "./workspace-channels.ts";
import { findInWorkspace } from "./workspace-posts.ts";

/** How many due instants a rule's page shows. */
export const comingShown = 3;

const encodeRule = Schema.encodeSync(RecyclingRule);

// Whether two reads of a rule hold the same rule, field for field.
const isSameRule = (left: RecyclingRule, right: RecyclingRule): boolean =>
  JSON.stringify(encodeRule(left)) === JSON.stringify(encodeRule(right));

/** How many due rules a run reads at once. */
export const duePageSize = 100;

/** An occurrence to come, and the variant it would say, if one. */
export interface ComingOccurrence {
  readonly at: DateTime.Utc;
  readonly occurrence: number;
  /** The variant's place, from 1; none for the source's own text. */
  readonly variant: Option.Option<number>;
}

/** A rule, with its next due instants. */
export interface ListedRule {
  readonly coming: readonly ComingOccurrence[];
  readonly rule: RecyclingRule;
}

/** What starts a rule on a post. */
export interface StartRequest {
  readonly count: Option.Option<number>;
  readonly interval: RecyclingInterval;
  readonly postId: PostId;
  readonly queueId: Option.Option<QueueId>;
  readonly until: Option.Option<LocalDate>;
  readonly variants: readonly RecyclingVariant[];
}

/** What a member changes of a rule: each left out stays as it is. */
export interface ChangeRequest extends RecyclingChange {
  /** True pauses it, false sets a paused rule going again. */
  readonly paused?: boolean;
}

/** A page of the workspace's rules. */
export interface ListRequest {
  readonly after: Option.Option<RecyclingRuleId>;
  readonly limit: number;
  readonly status: Option.Option<RecyclingStatus["_tag"]>;
}

/** What a run of the due rules did. */
export interface DueRun {
  /** Occurrences made. */
  readonly made: number;
  /** Rules due but not made this run: held, waiting, or failing for now. */
  readonly left: number;
  /** Rules that ended, completed or for a reason they were told. */
  readonly ended: number;
  /**
   * The latest times of the rules left on purpose, to wait (a starter
   * locked out, a source awaiting approval): no run is late on them.
   */
  readonly waitingSince: readonly DateTime.Utc[];
}

type Ports =
  | AccountRules
  | AttachableMedia
  | Ids
  | PostOrigins
  | PostRepository
  | QueueStore
  | TagStore
  | WorkspaceChannels;

// What a variant makes of the source's copy: its text, and its texts on
// the channels the copy still goes to, with their own media kept.
const sayingVariantOf = (
  copy: PostCopy,
  variant: Option.Option<RecyclingVariant>
): PostContent =>
  Option.match(variant, {
    onNone: () => copy.content,
    onSome: (chosen) => sayingVariant(copy.content, copy.channelIds, chosen),
  });

// The rule with its next due instants, and the variant each would say.
const listed = (rule: RecyclingRule, now: DateTime.Utc): ListedRule => ({
  coming: comingDue(rule, now, comingShown).map(({ at, occurrence }) => ({
    at,
    occurrence,
    variant: variantFor(rule, occurrence).pipe(
      Option.map((variant) => rule.variants.indexOf(variant) + 1)
    ),
  })),
  rule,
});

const listedNow = (rule: RecyclingRule) =>
  DateTime.now.pipe(Effect.map((now) => listed(rule, now)));

const scheduledAt = (post: Post) =>
  post.status._tag === "scheduled" || post.status._tag === "awaitingApproval"
    ? post.status.schedule.at
    : undefined;

/**
 * Repeating posts: rules that make a new post from a source post at an
 * interval, until a count or a date, with text variants taken in turn
 * (`#publishing/domain/recycling-rule.ts`).
 *
 * Reading rules needs post:read. Starting one needs to be able to ask for
 * posts to go out (`PostScheduling.mayAsk`), in person or as a key or an
 * application, never staff acting as a member; changing, pausing,
 * resuming or stopping one needs post:schedule, or to be its starter,
 * through the same origin (the web, the same application, the same key),
 * while they may still ask. A source is a post that is scheduled, publishing or
 * went out (unpublished from a platform since or not), one rule going on
 * at a time; a workspace keeps `maxRecyclingRulesPerWorkspace` rules
 * active or paused. Each variant is checked as the source with it would be
 * when scheduled, when it is saved.
 *
 * `makeDue` makes the next occurrence of every rule whose latest one's
 * time has passed, one per rule a run, each in a transaction of its own
 * that locks the rule's row first (skipping one held), sends the copy as
 * the starter is now (`RecyclingActors`, `PostScheduling.sendOccurrence`)
 * and writes the rule on, so a send that rolls back leaves the rule as it
 * was; or ends the rule, telling those it concerns, when its source, its
 * starter, its channels, its queue or the plan stop it.
 */
export class Recycling extends Context.Service<
  Recycling,
  {
    readonly list: (
      actor: Actor,
      request: ListRequest
    ) => Effect.Effect<
      readonly ListedRule[],
      DatabaseError | MissingPermission
    >;
    readonly get: (
      actor: Actor,
      ruleId: RecyclingRuleId
    ) => Effect.Effect<
      ListedRule,
      DatabaseError | MissingPermission | RecyclingRuleNotFound
    >;
    readonly start: (
      actor: Actor,
      request: StartRequest
    ) => Effect.Effect<
      ListedRule,
      | DatabaseError
      | MissingPermission
      | PostNotFound
      | PostNotRecyclable
      | QueueNotFound
      | RecyclingEndsTooSoon
      | RecyclingVariantsRejected
      | TooManyRecyclingRules
    >;
    readonly change: (
      actor: Actor,
      ruleId: RecyclingRuleId,
      request: ChangeRequest
    ) => Effect.Effect<
      ListedRule,
      | DatabaseError
      | MissingPermission
      | PostNotFound
      | RecyclingEndsTooSoon
      | RecyclingRuleEnded
      | RecyclingRuleNotFound
      | RecyclingVariantsRejected
    >;
    /**
     * Sets a paused rule going, or one that ended for a reason a member
     * can put right, with other variants if given.
     */
    readonly resume: (
      actor: Actor,
      ruleId: RecyclingRuleId,
      variants: Option.Option<readonly RecyclingVariant[]>
    ) => Effect.Effect<
      ListedRule,
      | DatabaseError
      | MissingPermission
      | PostNotFound
      | PostNotRecyclable
      | RecyclingEndsTooSoon
      | RecyclingRuleEnded
      | RecyclingRuleNotFound
      | RecyclingVariantsRejected
      | TooManyRecyclingRules
    >;
    /** Ends the rule: the occurrences it made stay as they are. */
    readonly stop: (
      actor: Actor,
      ruleId: RecyclingRuleId
    ) => Effect.Effect<
      void,
      DatabaseError | MissingPermission | RecyclingRuleNotFound
    >;
    /** Makes the occurrences due: the recycling cron's run. */
    readonly makeDue: Effect.Effect<DueRun, DatabaseError>;
    /**
     * How many active rules a run should have made by `before` and did not:
     * their latest time passed before it, but for those `run` left to wait.
     */
    readonly overdue: (
      before: DateTime.Utc,
      run: DueRun
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/publishing/application/Recycling") {
  static readonly layer = Layer.effect(
    Recycling,
    Effect.gen(function* RecyclingLive() {
      const store = yield* RecyclingStore;
      const scheduling = yield* PostScheduling;
      const posts = yield* PostRepository;
      const actors = yield* RecyclingActors;
      const notices = yield* RecyclingNotices;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ports>();

      const withPorts = Effect.provideContext(ports);

      // Who may ask for posts to go out, as themselves: never staff acting
      // as a member, whose occurrences would act as the member.
      const mayStart = Effect.fn("Recycling.mayStart")(function* mayStart(
        actor: Actor
      ) {
        yield* notImpersonating(actor);

        return yield* scheduling.mayAsk(actor);
      });

      // Those who may schedule change any rule; its starter changes their
      // own while they may still ask, and only from where they started it.
      const mayChange = (actor: Actor, rule: RecyclingRule) =>
        mayChangeStarted(actor, rule, mayStart(actor));

      const found = Effect.fn("Recycling.found")(function* found(
        actor: Actor,
        ruleId: RecyclingRuleId
      ) {
        const rule = yield* store.byId(actor.workspaceId, ruleId);

        if (Option.isNone(rule)) {
          return yield* new RecyclingRuleNotFound({ ruleId });
        }

        return rule.value;
      });

      // Each variant, said by the source on its channels still connected,
      // checked as scheduling would check it: every violation at once,
      // by variant.
      const variantsChecked = Effect.fn("Recycling.variantsChecked")(
        function* variantsChecked(
          actor: Actor,
          sourceId: PostId,
          variants: readonly RecyclingVariant[]
        ) {
          if (variants.length === 0) {
            return 0;
          }

          const { post } = yield* findInWorkspace(actor.workspaceId, sourceId);

          const copy = yield* copyOf(
            actor,
            post,
            yield* posts.targets(post.id)
          );

          const channels = yield* channelsFor(actor, copy.channelIds).pipe(
            Effect.catchTag("UnknownChannels", () => Effect.succeed([]))
          );

          const refused = yield* Effect.forEach(
            variants,
            Effect.fnUntraced(function* checked(variant, place) {
              const content = sayingVariantOf(copy, Option.some(variant));

              const files = yield* mediaFor(actor, content, copy.options).pipe(
                Effect.catchTag("UnknownMedia", () => Effect.succeed([]))
              );

              // A channel whose own media the variant gives no text.
              const unsaid: readonly ContentViolation[] = mediaWithoutTextOf(
                copy.content,
                copy.channelIds,
                variant
              ).flatMap((channelId) =>
                channels.flatMap((channel) =>
                  channel.channelId === channelId
                    ? [
                        {
                          _tag: "empty" as const,
                          channelId,
                          platform: channel.platform,
                        },
                      ]
                    : []
                )
              );

              const violations = [
                ...unsaid,
                ...(yield* violationsOf(
                  content,
                  channels,
                  files,
                  copy.options
                )),
              ];

              return Arr.isReadonlyArrayNonEmpty(violations)
                ? [{ variant: place + 1, violations }]
                : [];
            }),
            { concurrency: 1 }
          );

          const rejected = refused.flat();

          if (Arr.isReadonlyArrayNonEmpty(rejected)) {
            return yield* new RecyclingVariantsRejected({ variants: rejected });
          }

          return variants.length;
        },
        withPorts
      );

      const list = Effect.fn("Recycling.list")(function* list(
        actor: Actor,
        request: ListRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const rules = yield* store.list(actor.workspaceId, request);
        const now = yield* DateTime.now;

        return rules.map((rule) => listed(rule, now));
      });

      const get = Effect.fn("Recycling.get")(function* get(
        actor: Actor,
        ruleId: RecyclingRuleId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        return yield* listedNow(yield* found(actor, ruleId));
      });

      const start = Effect.fn("Recycling.start")(function* start(
        actor: Actor,
        request: StartRequest
      ) {
        yield* mayStart(actor);

        const { post } = yield* findInWorkspace(
          actor.workspaceId,
          request.postId
        ).pipe(withPorts);

        const { status } = post;

        if (
          status._tag === "draft" ||
          status._tag === "awaitingApproval" ||
          status._tag === "cancelled"
        ) {
          return yield* new PostNotRecyclable({
            postId: post.id,
            reason: status._tag,
          });
        }

        if (Option.isSome(post.occurrence)) {
          return yield* new PostNotRecyclable({
            postId: post.id,
            reason: "occurrence",
          });
        }

        const copy = yield* copyOf(
          actor,
          post,
          yield* posts.targets(post.id)
        ).pipe(withPorts);

        if (copy.channelIds.length === 0) {
          return yield* new PostNotRecyclable({
            postId: post.id,
            reason: "noChannels",
          });
        }

        if (Option.isSome(request.queueId)) {
          yield* queueNamed(actor.workspaceId, request.queueId).pipe(withPorts);
        }

        yield* variantsChecked(actor, post.id, request.variants);

        const id = yield* newId(RecyclingRuleIdSchema).pipe(withPorts);

        const via = yield* PostOrigins.use((origins) => origins.of(actor)).pipe(
          withPorts
        );

        return yield* transaction(
          Effect.gen(function* add() {
            yield* store.claim(actor.workspaceId);

            if (
              (yield* store.countLive(actor.workspaceId)) >=
              maxRecyclingRulesPerWorkspace
            ) {
              return yield* new TooManyRecyclingRules({
                allowed: maxRecyclingRulesPerWorkspace,
              });
            }

            if (
              Option.isSome(yield* store.ofSource(actor.workspaceId, post.id))
            ) {
              return yield* new PostNotRecyclable({
                postId: post.id,
                reason: "repeating",
              });
            }

            const now = yield* DateTime.now;

            const rule = yield* Effect.fromResult(
              startRule(
                {
                  anchorAt: status.schedule.at,
                  count: request.count,
                  id,
                  interval: request.interval,
                  queueId: request.queueId,
                  sourcePostId: post.id,
                  startedBy: starterOf(actor),
                  startedVia: via,
                  timeZone: status.schedule.timeZone,
                  until: request.until,
                  variants: request.variants,
                  workspaceId: actor.workspaceId,
                },
                now
              )
            );

            yield* store.insert(rule);

            return listed(rule, now);
          })
        );
      });

      // A rule, locked, changed by whoever may, and saved.
      const changed = Effect.fn("Recycling.changed")(function* changed<E>(
        actor: Actor,
        ruleId: RecyclingRuleId,
        variants: Option.Option<readonly RecyclingVariant[]>,
        edit: (
          rule: RecyclingRule,
          now: DateTime.Utc
        ) => Effect.Effect<RecyclingRule, E>
      ) {
        const current = yield* found(actor, ruleId);

        yield* mayChange(actor, current);

        if (Option.isSome(variants)) {
          yield* variantsChecked(actor, current.sourcePostId, variants.value);
        }

        return yield* transaction(
          Effect.gen(function* save() {
            const locked = yield* store.lock(actor.workspaceId, ruleId);

            if (Option.isNone(locked)) {
              return yield* new RecyclingRuleNotFound({ ruleId });
            }

            const now = yield* DateTime.now;
            const rule = yield* edit(locked.value, now);

            yield* store.update(rule);

            return listed(rule, now);
          })
        );
      });

      const change = Effect.fn("Recycling.change")(function* change(
        actor: Actor,
        ruleId: RecyclingRuleId,
        { paused, ...request }: ChangeRequest
      ) {
        return yield* changed(
          actor,
          ruleId,
          Option.fromUndefinedOr(request.variants),
          (rule, now) =>
            Effect.fromResult(editRule(rule, request)).pipe(
              Effect.flatMap((edited) => {
                if (paused === true) {
                  return Effect.fromResult(pauseRule(edited, now));
                }

                return paused === false && edited.status._tag === "paused"
                  ? Effect.fromResult(resumeRule(edited, now))
                  : Effect.succeed(edited);
              })
            )
        );
      });

      // Sets a rule going again. Its source must repeat again (scheduled,
      // going out or out); an ended rule comes back to life only when its
      // source has no other rule going on and the workspace has room for
      // one more, as a new rule would, under the same lock.
      const resume = Effect.fn("Recycling.resume")(function* resume(
        actor: Actor,
        ruleId: RecyclingRuleId,
        variants: Option.Option<readonly RecyclingVariant[]>
      ) {
        const current = yield* found(actor, ruleId);

        yield* mayChange(actor, current);

        const { post } = yield* findInWorkspace(
          actor.workspaceId,
          current.sourcePostId
        ).pipe(withPorts);

        const { status } = post;

        if (
          status._tag === "draft" ||
          status._tag === "awaitingApproval" ||
          status._tag === "cancelled"
        ) {
          return yield* new PostNotRecyclable({
            postId: post.id,
            reason: status._tag,
          });
        }

        if (Option.isSome(variants)) {
          yield* variantsChecked(actor, current.sourcePostId, variants.value);
        }

        return yield* transaction(
          Effect.gen(function* save() {
            yield* store.claim(actor.workspaceId);

            const locked = yield* store.lock(actor.workspaceId, ruleId);

            if (Option.isNone(locked)) {
              return yield* new RecyclingRuleNotFound({ ruleId });
            }

            const rule = locked.value;

            if (rule.status._tag === "ended") {
              const other = yield* store.ofSource(
                actor.workspaceId,
                rule.sourcePostId
              );

              if (Option.isSome(other) && other.value.id !== rule.id) {
                return yield* new PostNotRecyclable({
                  postId: rule.sourcePostId,
                  reason: "repeating",
                });
              }

              if (
                (yield* store.countLive(actor.workspaceId)) >=
                maxRecyclingRulesPerWorkspace
              ) {
                return yield* new TooManyRecyclingRules({
                  allowed: maxRecyclingRulesPerWorkspace,
                });
              }
            }

            const now = yield* DateTime.now;

            const resumed = yield* Effect.fromResult(
              resumeRule(
                rule,
                now,
                Option.getOrElse(variants, () => rule.variants)
              )
            );

            yield* store.update(resumed);

            return listed(resumed, now);
          })
        );
      });

      const stop = Effect.fn("Recycling.stop")(function* stop(
        actor: Actor,
        ruleId: RecyclingRuleId
      ) {
        yield* changed(actor, ruleId, Option.none(), (rule, now) =>
          Effect.succeed(endRule(rule, "stopped", now))
        ).pipe(
          // No variant is checked, so no source is read.
          Effect.catchTags({
            PostNotFound: Effect.die,
            RecyclingVariantsRejected: Effect.die,
          })
        );
      });

      // Ends the rule for `reason`, telling whoever it concerns, in one
      // transaction under its lock: a rule another run or a member holds,
      // or that changed in any way since it was read (the reason was judged
      // on what was read: a member may have moved its ending or corrected a
      // variant), is left for the next run, which judges it anew.
      const ended = Effect.fn("Recycling.ended")(function* ended(
        planned: RecyclingRule,
        reason: RecyclingEndReason
      ) {
        return yield* transaction(
          Effect.gen(function* end() {
            const locked = yield* store.lockUnlessHeld(planned.id);

            if (Option.isNone(locked) || !isSameRule(locked.value, planned)) {
              return "left" as const;
            }

            const rule = endRule(locked.value, reason, yield* DateTime.now);

            yield* store.update(rule);
            yield* notices.ended(rule, reason);

            return "ended" as const;
          })
        );
      });

      type Outcome = "ended" | "left" | "made" | "waiting";

      // The rule's next occurrence, made, or why the rule ends or waits.
      const makeOne = Effect.fn("Recycling.makeOne")(function* makeOne(
        planned: RecyclingRule
      ) {
        const now = yield* DateTime.now;

        if (!isDue(planned, now)) {
          return "left" as const;
        }

        const source = yield* posts.find(planned.sourcePostId);

        if (
          Option.isNone(source) ||
          source.value.post.workspaceId !== planned.workspaceId
        ) {
          return yield* ended(planned, "sourceGone");
        }

        // Made only while the source is scheduled, going out or went out:
        // one cancelled or taken back to draft ends the rule, to resume
        // once it is scheduled again; one waiting for an approval waits.
        const sourceStatus = source.value.post.status._tag;

        if (sourceStatus === "draft" || sourceStatus === "cancelled") {
          return yield* ended(planned, "sourceWithdrawn");
        }

        if (sourceStatus === "awaitingApproval") {
          return "waiting" as const;
        }

        const starter = yield* actors.of(planned);

        // Locked out for now, as by a two-step requirement: the rule
        // waits for them, and is made once they are back.
        if (starter._tag === "lockedOut") {
          return "waiting" as const;
        }

        if (starter._tag === "gone") {
          return yield* ended(planned, "starterGone");
        }

        const { actor } = starter;
        const { post } = source.value;
        const targets = yield* posts.targets(post.id);

        // A starter who may no longer read the channels can no longer
        // schedule there either.
        const copy = yield* copyOf(actor, post, targets).pipe(
          withPorts,
          Effect.map(Option.some),
          Effect.catchTag("MissingPermission", () =>
            Effect.succeed(Option.none<PostCopy>())
          )
        );

        if (Option.isNone(copy)) {
          return yield* ended(planned, "starterGone");
        }

        if (copy.value.channelIds.length === 0) {
          return yield* ended(planned, "noChannels");
        }

        const number = planned.made + 1;
        const dueAt = plannedAt(planned, now);

        // Missed until past its ending: nothing more to make.
        if (!isWithinEnding(planned, number, dueAt)) {
          return yield* ended(planned, "completed");
        }

        const outcome = yield* scheduling
          .sendOccurrence(actor, {
            channelIds: copy.value.channelIds,
            // The rule as the run read it, still: one held, made, ended,
            // or changed by a member since (its variants, its ending) is
            // left for the next run, which reads it anew, so a change is
            // never written over.
            claimed: Effect.gen(function* claimed() {
              const locked = yield* store.lockUnlessHeld(planned.id);

              yield* Option.isNone(locked) || !isSameRule(locked.value, planned)
                ? Effect.fail(new LeftForNextRun({ ruleId: planned.id }))
                : Effect.void;
            }),
            content: sayingVariantOf(copy.value, variantFor(planned, number)),
            dueAt,
            made: (made) =>
              Effect.gen(function* written() {
                const at = scheduledAt(made) ?? dueAt;

                // A queue's slot past the rule's last day: the send rolls
                // back, and the rule ends completed.
                if (!isWithinEnding(planned, number, at)) {
                  return yield* new RecyclingEndingPassed({
                    ruleId: planned.id,
                  });
                }

                return yield* store.update(
                  occurrenceMade(planned, dueAt, at, yield* DateTime.now)
                );
              }),
            occurrence: { number, ruleId: planned.id },
            options: copy.value.options,
            placement: Option.match(planned.queueId, {
              onNone: () => ({ _tag: "at" }) as const,
              onSome: (queueId) => ({ _tag: "queue", queueId }) as const,
            }),
            shortenLinks: copy.value.shortenLinks,
            tagIds: copy.value.tagIds,
            timeZone: planned.timeZone,
          })
          .pipe(
            Effect.as("made" as const),
            Effect.catchTags({
              LeftForNextRun: () => Effect.succeed("left" as const),
              MissingPermission: () => Effect.succeed("starterGone" as const),
              PlanLimitReached: () => Effect.succeed("planLimit" as const),
              PostContentRejected: () =>
                Effect.succeed("contentRejected" as const),
              QueueHasNoRoom: () => Effect.succeed("queueFull" as const),
              QueueNotFound: () => Effect.succeed("queueGone" as const),
              RecyclingEndingPassed: () => Effect.succeed("completed" as const),
              // Gone between the copy and the send: the next run copies
              // what is left.
              ScheduleInPast: () => Effect.succeed("left" as const),
              UnknownChannels: () => Effect.succeed("left" as const),
              UnknownMedia: () => Effect.succeed("left" as const),
              UnknownTags: () => Effect.succeed("left" as const),
            })
          );

        if (outcome === "made" || outcome === "left") {
          return outcome;
        }

        return yield* ended(planned, outcome);
      });

      const makeDue = Effect.gen(function* makeDue() {
        const now = yield* DateTime.now;

        let after = Option.none<{
          id: RecyclingRuleId;
          lastDueAt: DateTime.Utc;
        }>();

        let made = 0;
        let left = 0;
        let endedCount = 0;
        const waitingSince: DateTime.Utc[] = [];

        for (;;) {
          const page = yield* store.due(now, after, duePageSize);

          for (const rule of page) {
            const outcome: Outcome = yield* makeOne(rule).pipe(
              // A rule that fails for now (the database, a directory that
              // does not answer) is left for the next run, and said.
              Effect.catchTag("DatabaseError", (failure) =>
                Effect.logWarning(
                  "A recycling rule's occurrence could not be made",
                  failure
                ).pipe(
                  Effect.annotateLogs({ ruleId: rule.id }),
                  Effect.as("left" as const)
                )
              )
            );

            if (outcome === "made") {
              made += 1;
            } else if (outcome === "waiting") {
              left += 1;
              waitingSince.push(rule.lastDueAt);
            } else if (outcome === "left") {
              left += 1;
            } else {
              endedCount += 1;
            }
          }

          const last = page.at(-1);

          if (last === undefined || page.length < duePageSize) {
            const run: DueRun = {
              ended: endedCount,
              left,
              made,
              waitingSince,
            };

            return run;
          }

          after = Option.some({ id: last.id, lastDueAt: last.lastDueAt });
        }
      }).pipe(Effect.withSpan("Recycling.makeDue"));

      return Recycling.of({
        change,
        get,
        list,
        makeDue,
        overdue: (before, run) =>
          store
            .overdue(before)
            .pipe(
              Effect.map((late) =>
                Math.max(
                  0,
                  late -
                    run.waitingSince.filter((at) =>
                      DateTime.isLessThan(at, before)
                    ).length
                )
              )
            ),
        resume,
        start,
        stop,
      });
    })
  );
}
