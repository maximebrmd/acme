import { Context, DateTime, Effect, Layer, Option } from "effect";

import { carriesSome } from "#publishing/domain/follow-up-ability.ts";
import type { ChannelFollowUps } from "#publishing/domain/follow-up-ability.ts";
import type { FollowUpRuleEnded } from "#publishing/domain/follow-up-rule-ended.ts";
import { FollowUpRuleIdSchema } from "#publishing/domain/follow-up-rule-id.ts";
import type { FollowUpRuleId } from "#publishing/domain/follow-up-rule-id.ts";
import {
  approveFollowUpRule,
  changeFollowUpRule,
  endFollowUpRule,
  maxFollowUpRulesPerWorkspace,
  startFollowUpRule,
} from "#publishing/domain/follow-up-rule.ts";
import type {
  FollowUpChange,
  FollowUpChanger,
  FollowUpRule,
  FollowUpRuleStatus,
  FollowUpScope,
} from "#publishing/domain/follow-up-rule.ts";
import type { FollowUp } from "#publishing/domain/follow-up.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { can } from "#shared/domain/access.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { ChannelId, PostId, UserId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import { storableText } from "#shared/domain/platform-text.ts";

import { ApprovalGate } from "./approval-gate.ts";
import { FollowUpChannels } from "./follow-up-channels.ts";
import { FollowUpNotPossible } from "./follow-up-not-possible.ts";
import { FollowUpRuleNotFound } from "./follow-up-rule-not-found.ts";
import { FollowUpRuleTaken } from "./follow-up-rule-taken.ts";
import { FollowUpStore } from "./follow-up-store.ts";
import { FollowUps, askOf } from "./follow-ups.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostOrigins } from "./post-origins.ts";
import { PostRepository } from "./post-repository.ts";
import { mayChangeStarted, notImpersonating, starterOf } from "./started-by.ts";
import { TooManyFollowUpRules } from "./too-many-follow-up-rules.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";
import { findInWorkspace } from "./workspace-posts.ts";

/**
 * Who approves a rule by changing it: a person who may approve posts,
 * never an application, a key or staff acting as them.
 */
const approverOf = (actor: Actor): Option.Option<UserId> =>
  actor.subject._tag === "user" &&
  actor.subject.clientId === undefined &&
  Option.isNone(actor.subject.impersonatedBy) &&
  can(actor, "post:approve")
    ? Option.some(actor.subject.userId)
    : Option.none();

/** How many of a rule's follow-ups its view shows, newest first. */
export const followUpsShown = 20;

/** The most a comment holds, whatever the platform: the posts' own cap. */
export const maxFollowUpCommentLength = 10_000;

/** A rule, with what it did and what each of its channels can carry. */
export interface ListedFollowUpRule {
  readonly channels: readonly ChannelFollowUps[];
  readonly followUps: readonly FollowUp[];
  readonly rule: FollowUpRule;
}

/** What starts a rule. */
export interface StartFollowUpRequest {
  readonly comment: Option.Option<string>;
  readonly likes: number;
  readonly repost: boolean;
  readonly scope: FollowUpScope;
}

/** What a member changes of a rule: each left out stays as it is. */
export interface ChangeFollowUpRequest {
  readonly comment?: Option.Option<string>;
  readonly likes?: number;
  readonly paused?: boolean;
  readonly repost?: boolean;
}

/** A page of the workspace's rules. */
export interface ListFollowUpRequest {
  readonly after: Option.Option<FollowUpRuleId>;
  readonly limit: number;
  /** One post's rules alone. */
  readonly postId: Option.Option<PostId>;
  readonly status: Option.Option<FollowUpRuleStatus["_tag"]>;
}

type Refused = DatabaseError | MissingPermission;

// A change as it is put together, field by field.
type ChangeBeingMade = {
  -readonly [K in keyof FollowUpChange]: FollowUpChange[K];
};

// What a member's request changes, its comment cleaned (`comment`, left
// out when the request says nothing of it).
const changeOf = (
  request: ChangeFollowUpRequest,
  comment: Option.Option<string> | undefined
): FollowUpChange => {
  const change: ChangeBeingMade = {};

  if (comment !== undefined) {
    change.comment = comment;
  }

  if (request.likes !== undefined) {
    change.likes = request.likes;
  }

  if (request.paused !== undefined) {
    change.paused = request.paused;
  }

  if (request.repost !== undefined) {
    change.repost = request.repost;
  }

  return change;
};

// A comment as it is kept: storable, trimmed, none when nothing is left.
const cleanComment = (
  comment: Option.Option<string>
): Option.Option<Option.Option<string>> =>
  Option.match(comment, {
    onNone: () => Option.some(Option.none()),
    onSome: (text) => {
      const kept = storableText(text, maxFollowUpCommentLength).trim();

      return kept.length === 0 ? Option.none() : Option.some(Option.some(kept));
    },
  });

/**
 * Rules that act by themselves on the workspace's own posts once they have
 * enough likes (`#publishing/domain/follow-up-rule.ts`), as members keep
 * them: one post's, or every post a channel publishes after it starts.
 *
 * Reading needs post:read. Starting one needs to be able to ask for posts
 * to go out, in person or as a key or an application, never staff acting
 * as a member; where the approval policy holds the starter's posts, the
 * rule waits for a member who approves posts (`approve`, post:approve, in
 * person) before it acts. Changing, pausing and stopping one needs
 * post:schedule, or to be its starter acting as they started it. A rule
 * is refused when no channel it acts on can carry what it asks
 * (`FollowUpNotPossible`, each channel with its reasons), or when its
 * comment is longer than a channel that could carry it takes. A post has
 * one rule going on at a time, so has a channel, and a workspace
 * `maxFollowUpRulesPerWorkspace` active or paused.
 */
export class FollowUpRules extends Context.Service<
  FollowUpRules,
  {
    readonly list: (
      actor: Actor,
      request: ListFollowUpRequest
    ) => Effect.Effect<readonly ListedFollowUpRule[], Refused>;
    readonly get: (
      actor: Actor,
      ruleId: FollowUpRuleId
    ) => Effect.Effect<ListedFollowUpRule, Refused | FollowUpRuleNotFound>;
    readonly start: (
      actor: Actor,
      request: StartFollowUpRequest
    ) => Effect.Effect<
      ListedFollowUpRule,
      | Refused
      | FollowUpNotPossible
      | FollowUpRuleTaken
      | PostNotFound
      | TooManyFollowUpRules
    >;
    readonly change: (
      actor: Actor,
      ruleId: FollowUpRuleId,
      request: ChangeFollowUpRequest
    ) => Effect.Effect<
      ListedFollowUpRule,
      Refused | FollowUpNotPossible | FollowUpRuleEnded | FollowUpRuleNotFound
    >;
    readonly approve: (
      actor: Actor,
      ruleId: FollowUpRuleId
    ) => Effect.Effect<
      ListedFollowUpRule,
      Refused | FollowUpRuleEnded | FollowUpRuleNotFound
    >;
    /** Ends the rule: what it sent stays; what it armed is given up. */
    readonly stop: (
      actor: Actor,
      ruleId: FollowUpRuleId
    ) => Effect.Effect<void, Refused | FollowUpRuleNotFound>;
  }
>()("peal-server/publishing/application/FollowUpRules") {
  static readonly layer = Layer.effect(
    FollowUpRules,
    Effect.gen(function* FollowUpRulesLive() {
      const store = yield* FollowUpStore;
      const followUps = yield* FollowUps;
      const channels = yield* FollowUpChannels;
      const workspaceChannels = yield* WorkspaceChannels;
      const gate = yield* ApprovalGate;
      const origins = yield* PostOrigins;
      const posts = yield* PostRepository;
      const ids = yield* Ids;
      const { transaction } = yield* TransactionRunner;

      // Whoever may ask for posts to go out, as themselves.
      const mayStart = Effect.fn("FollowUpRules.mayStart")(function* mayStart(
        actor: Actor
      ) {
        yield* notImpersonating(actor);

        if (!(can(actor, "post:schedule") || (yield* gate.maySubmit(actor)))) {
          return yield* new MissingPermission({ permission: "post:schedule" });
        }

        return actor;
      });

      // The channels the scope acts on, as the actor may read them.
      const channelsOf = Effect.fn("FollowUpRules.channelsOf")(
        function* channelsOf(actor: Actor, scope: FollowUpScope) {
          const named: readonly ChannelId[] =
            scope._tag === "channel"
              ? [scope.channelId]
              : (yield* posts.targets(scope.postId))
                  .filter((target) => target.status._tag !== "cancelled")
                  .map(({ channelId }) => channelId);

          return yield* workspaceChannels.lookUp(actor, named);
        }
      );

      const abilitiesOf = Effect.fn("FollowUpRules.abilitiesOf")(
        function* abilitiesOf(actor: Actor, rule: FollowUpRule) {
          const found = yield* channelsOf(actor, rule.scope);

          return yield* Effect.forEach((channel: (typeof found)[number]) =>
            channels.of(
              {
                channelId: channel.channelId,
                connection: Option.fromUndefinedOr(channel.connection),
                platform: channel.platform,
              },
              askOf(rule)
            )
          )(found);
        }
      );

      const listed = Effect.fn("FollowUpRules.listed")(function* listed(
        actor: Actor,
        rule: FollowUpRule
      ) {
        const listedRule: ListedFollowUpRule = {
          channels: yield* abilitiesOf(actor, rule),
          followUps: yield* store.ofRule(rule.id, followUpsShown),
          rule,
        };

        return listedRule;
      });

      // The rule refused unless some channel carries what it asks, and
      // the comment fits every channel that would.
      const possible = Effect.fn("FollowUpRules.possible")(function* possible(
        actor: Actor,
        rule: FollowUpRule
      ) {
        if (Option.isNone(rule.comment) && !rule.repost) {
          return yield* new FollowUpNotPossible({
            channels: [],
            reason: "noAction",
          });
        }

        const abilities = yield* abilitiesOf(actor, rule);

        if (abilities.length === 0) {
          return yield* new FollowUpNotPossible({
            channels: [],
            reason: "noChannel",
          });
        }

        if (
          !abilities.some(carriesSome) ||
          abilities.some(({ comment }) => comment === "textTooLong")
        ) {
          return yield* new FollowUpNotPossible({
            channels: abilities,
            reason: "channels",
          });
        }

        return abilities;
      });

      const found = Effect.fn("FollowUpRules.found")(function* found(
        actor: Actor,
        ruleId: FollowUpRuleId,
        lock: boolean
      ) {
        const rule = lock
          ? yield* store.lockRule(actor.workspaceId, ruleId)
          : yield* store.rule(actor.workspaceId, ruleId);

        if (Option.isNone(rule)) {
          return yield* new FollowUpRuleNotFound({ ruleId });
        }

        return rule.value;
      });

      const mayChange = (actor: Actor, rule: FollowUpRule) =>
        mayChangeStarted(actor, rule, mayStart(actor));

      const list = Effect.fn("FollowUpRules.list")(function* list(
        actor: Actor,
        request: ListFollowUpRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        const rules = yield* store.listRules(actor.workspaceId, request);

        return yield* Effect.forEach((rule: FollowUpRule) =>
          listed(actor, rule)
        )(rules);
      });

      const get = Effect.fn("FollowUpRules.get")(function* get(
        actor: Actor,
        ruleId: FollowUpRuleId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:read"));

        return yield* listed(actor, yield* found(actor, ruleId, false));
      });

      const start = Effect.fn("FollowUpRules.start")(function* start(
        actor: Actor,
        request: StartFollowUpRequest
      ) {
        yield* mayStart(actor);

        const comment = cleanComment(request.comment);

        if (Option.isNone(comment)) {
          return yield* new FollowUpNotPossible({
            channels: [],
            reason: "emptyComment",
          });
        }

        if (request.scope._tag === "post") {
          const stored = yield* findInWorkspace(
            actor.workspaceId,
            request.scope.postId
          ).pipe(Effect.provideService(PostRepository, posts));

          if (stored.post.status._tag === "cancelled") {
            return yield* new FollowUpNotPossible({
              channels: [],
              reason: "postCancelled",
            });
          }
        }

        const id = yield* newId(FollowUpRuleIdSchema).pipe(
          Effect.provideService(Ids, ids)
        );

        const startedVia = yield* origins.of(actor);
        const needsApproval = yield* gate.holds(actor);
        const now = yield* DateTime.now;

        const rule = startFollowUpRule(
          {
            comment: comment.value,
            id,
            likes: request.likes,
            needsApproval,
            repost: request.repost,
            scope: request.scope,
            startedBy: starterOf(actor),
            startedVia,
            workspaceId: actor.workspaceId,
          },
          now
        );

        yield* possible(actor, rule);

        yield* transaction(
          Effect.gen(function* save() {
            yield* store.claim(actor.workspaceId);

            if (
              (yield* store.countOpen(actor.workspaceId)) >=
              maxFollowUpRulesPerWorkspace
            ) {
              return yield* new TooManyFollowUpRules({
                allowed: maxFollowUpRulesPerWorkspace,
              });
            }

            const taken =
              rule.scope._tag === "post"
                ? yield* store.openOfPost(actor.workspaceId, rule.scope.postId)
                : yield* store.openOfChannel(
                    actor.workspaceId,
                    rule.scope.channelId
                  );

            if (Option.isSome(taken)) {
              return yield* new FollowUpRuleTaken({ ruleId: taken.value.id });
            }

            yield* store.insertRule(rule);

            const arming = yield* followUps.armPublished(rule);

            // Another rule already follows up all the post asks: this one
            // would do nothing, and hold the post.
            if (arming.armed.length === 0 && arming.taken > 0) {
              return yield* new FollowUpNotPossible({
                channels: [],
                reason: "alreadyFollowedUp",
              });
            }
          })
        );

        return yield* listed(actor, rule);
      });

      const change = Effect.fn("FollowUpRules.change")(function* change(
        actor: Actor,
        ruleId: FollowUpRuleId,
        request: ChangeFollowUpRequest
      ) {
        const comment =
          request.comment === undefined
            ? Option.some(undefined)
            : cleanComment(request.comment);

        if (Option.isNone(comment)) {
          return yield* new FollowUpNotPossible({
            channels: [],
            reason: "emptyComment",
          });
        }

        // Staff acting as a member never rewrites what goes out as them.
        yield* notImpersonating(actor);

        const changer = {
          approver: approverOf(actor),
          held: yield* gate.holds(actor),
        } satisfies FollowUpChanger;

        const now = yield* DateTime.now;

        const changed = yield* transaction(
          Effect.gen(function* save() {
            const rule = yield* found(actor, ruleId, true);

            yield* mayChange(actor, rule);

            const next = yield* Effect.fromResult(
              changeFollowUpRule(
                rule,
                changeOf(request, comment.value),
                changer,
                now
              )
            );

            if (request.comment !== undefined || request.repost !== undefined) {
              yield* possible(actor, next);
            }

            yield* store.updateRule(next);
            // A kind it now asks goes on what of its post is already out.
            yield* followUps.armPublished(next);

            return next;
          })
        );

        return yield* listed(actor, changed);
      });

      const approve = Effect.fn("FollowUpRules.approve")(function* approve(
        actor: Actor,
        ruleId: FollowUpRuleId
      ) {
        yield* Effect.fromResult(authorize(actor, "post:approve"));

        const { subject } = actor;

        // An approval is a person's, never an application's or a key's.
        if (subject._tag !== "user" || subject.clientId !== undefined) {
          return yield* new MissingPermission({ permission: "post:approve" });
        }

        const now = yield* DateTime.now;

        const approved = yield* transaction(
          Effect.gen(function* save() {
            const rule = yield* found(actor, ruleId, true);

            const next = yield* Effect.fromResult(
              approveFollowUpRule(rule, subject.userId, now)
            );

            yield* store.updateRule(next);
            // A kind it now asks goes on what of its post is already out.
            yield* followUps.armPublished(next);

            return next;
          })
        );

        return yield* listed(actor, approved);
      });

      const stop = Effect.fn("FollowUpRules.stop")(function* stop(
        actor: Actor,
        ruleId: FollowUpRuleId
      ) {
        const now = yield* DateTime.now;

        yield* transaction(
          Effect.gen(function* save() {
            const rule = yield* found(actor, ruleId, true);

            yield* mayChange(actor, rule);

            if (rule.status._tag === "ended") {
              return;
            }

            const ended = endFollowUpRule(rule, "stopped", now);

            yield* store.updateRule(ended);
            yield* followUps.cancelArmed(ended);
          })
        );
      });

      return FollowUpRules.of({ approve, change, get, list, start, stop });
    })
  );
}
