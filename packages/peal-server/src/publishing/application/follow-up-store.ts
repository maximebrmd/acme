import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { FollowUpId } from "#publishing/domain/follow-up-id.ts";
import type { FollowUpRuleId } from "#publishing/domain/follow-up-rule-id.ts";
import type {
  FollowUpRule,
  FollowUpRuleStatus,
} from "#publishing/domain/follow-up-rule.ts";
import type { FollowUp } from "#publishing/domain/follow-up.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";

/** A page of a workspace's rules, oldest first, after a rule. */
export interface FollowUpRulePage {
  readonly after: Option.Option<FollowUpRuleId>;
  readonly limit: number;
  /** One post's rules alone. */
  readonly postId: Option.Option<PostId>;
  readonly status: Option.Option<FollowUpRuleStatus["_tag"]>;
}

/** An armed follow-up, with the rule that armed it. */
export interface ArmedFollowUp {
  readonly followUp: FollowUp;
  readonly rule: FollowUpRule;
}

/**
 * The workspaces' follow-up rules and what they armed, as they are kept:
 * ids, counts and the rules' own text, never what a post says.
 */
export class FollowUpStore extends Context.Service<
  FollowUpStore,
  {
    /**
     * Holds back, until the transaction it runs in ends, any other
     * transaction that claims the workspace's rules: counting them, then
     * adding one, takes turns.
     */
    readonly claim: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    readonly insertRule: (
      rule: FollowUpRule
    ) => Effect.Effect<void, DatabaseError>;
    /** Writes what changes of a rule: everything but what started it. */
    readonly updateRule: (
      rule: FollowUpRule
    ) => Effect.Effect<void, DatabaseError>;
    readonly rule: (
      workspaceId: WorkspaceId,
      ruleId: FollowUpRuleId
    ) => Effect.Effect<Option.Option<FollowUpRule>, DatabaseError>;
    /** The rule, its row locked until the transaction ends. */
    readonly lockRule: (
      workspaceId: WorkspaceId,
      ruleId: FollowUpRuleId
    ) => Effect.Effect<Option.Option<FollowUpRule>, DatabaseError>;
    /** How many of the workspace's rules are active or paused. */
    readonly countOpen: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DatabaseError>;
    /** The post's rule that has not ended, if one has. */
    readonly openOfPost: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<Option.Option<FollowUpRule>, DatabaseError>;
    /** The channel's rule that has not ended, if one has. */
    readonly openOfChannel: (
      workspaceId: WorkspaceId,
      channelId: ChannelId
    ) => Effect.Effect<Option.Option<FollowUpRule>, DatabaseError>;
    readonly listRules: (
      workspaceId: WorkspaceId,
      page: FollowUpRulePage
    ) => Effect.Effect<readonly FollowUpRule[], DatabaseError>;
    /**
     * Arms each follow-up that no other rule armed of its kind on its
     * target (one comment and one repost a target, whatever rules act on
     * it): the others are left as they are. Answers those armed.
     */
    readonly arm: (
      followUps: readonly FollowUp[]
    ) => Effect.Effect<readonly FollowUp[], DatabaseError>;
    /** The follow-ups a rule armed, newest first: `limit` at most. */
    readonly ofRule: (
      ruleId: FollowUpRuleId,
      limit: number
    ) => Effect.Effect<readonly FollowUp[], DatabaseError>;
    /** The follow-ups a rule armed that wait for their threshold. */
    readonly armedOfRule: (
      ruleId: FollowUpRuleId
    ) => Effect.Effect<readonly FollowUp[], DatabaseError>;
    readonly followUp: (
      followUpId: FollowUpId
    ) => Effect.Effect<Option.Option<FollowUp>, DatabaseError>;
    /**
     * The follow-up, its row locked until the transaction ends, or none
     * when another transaction holds it (`FOR UPDATE SKIP LOCKED`).
     */
    readonly lockUnlessHeld: (
      followUpId: FollowUpId
    ) => Effect.Effect<Option.Option<FollowUp>, DatabaseError>;
    /**
     * Writes the follow-up's state, only from the state it was read in
     * (`from`): answers whether it was written, so a job, the handover
     * and a rule's end never overwrite each other.
     */
    readonly advance: (
      next: FollowUp,
      from: FollowUp
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Armed follow-ups of every workspace, with their rules, after
     * `after` by id: `limit` at most.
     */
    readonly armed: (
      after: Option.Option<FollowUpId>,
      limit: number
    ) => Effect.Effect<readonly ArmedFollowUp[], DatabaseError>;
    /**
     * How many follow-ups the channel set out to carry out (`sending` or
     * after) since `since`: the day's count.
     */
    readonly triggeredSince: (
      channelId: ChannelId,
      since: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Marks that a gate is about to call the platform for the follow-up,
     * if it is still `sending`: answers whether it is. A gate never calls
     * for one that ended or was handed over meanwhile.
     */
    readonly claimCall: (
      followUpId: FollowUpId,
      now: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Follow-ups still `sending` since before `triggeredBefore` whose call,
     * if one was claimed, was claimed before `callBefore`: `limit` at most.
     */
    readonly stranded: (
      triggeredBefore: DateTime.Utc,
      callBefore: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly FollowUp[], DatabaseError>;
    /**
     * Post-scoped rules that are active or paused and have armed
     * follow-ups, none of which is armed or on its way: `limit` at most.
     */
    readonly settledPostRules: (
      limit: number
    ) => Effect.Effect<readonly FollowUpRule[], DatabaseError>;
    /** Channel-scoped rules that have not ended, by id, after `after`. */
    readonly openChannelRules: (
      after: Option.Option<FollowUpRuleId>,
      limit: number
    ) => Effect.Effect<readonly FollowUpRule[], DatabaseError>;
  }
>()("peal-server/publishing/application/FollowUpStore") {}
