import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { RecyclingRuleId } from "#publishing/domain/recycling-rule-id.ts";
import type {
  RecyclingRule,
  RecyclingStatus,
} from "#publishing/domain/recycling-rule.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

/** Where a page of due rules starts: after this rule, in their order. */
export interface DuePosition {
  readonly id: RecyclingRuleId;
  readonly lastDueAt: DateTime.Utc;
}

/** A page of a workspace's rules, oldest first, after a rule. */
export interface RulePage {
  readonly after: Option.Option<RecyclingRuleId>;
  readonly limit: number;
  readonly status: Option.Option<RecyclingStatus["_tag"]>;
}

/** A workspace's recycling rules, as they are kept. */
export class RecyclingStore extends Context.Service<
  RecyclingStore,
  {
    /**
     * Holds back, until the transaction it runs in ends, any other
     * transaction that claims the workspace's rules: counting them, then
     * adding one, takes turns.
     */
    readonly claim: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    readonly insert: (
      rule: RecyclingRule
    ) => Effect.Effect<void, DatabaseError>;
    /** Writes what changes of a rule: everything but what started it. */
    readonly update: (
      rule: RecyclingRule
    ) => Effect.Effect<void, DatabaseError>;
    readonly byId: (
      workspaceId: WorkspaceId,
      ruleId: RecyclingRuleId
    ) => Effect.Effect<Option.Option<RecyclingRule>, DatabaseError>;
    /**
     * The rule, its row locked until the transaction ends: what a member
     * changes of it and what makes its occurrence take turns.
     */
    readonly lock: (
      workspaceId: WorkspaceId,
      ruleId: RecyclingRuleId
    ) => Effect.Effect<Option.Option<RecyclingRule>, DatabaseError>;
    /**
     * The rule, its row locked until the transaction ends, or none when
     * another transaction holds it (`FOR UPDATE SKIP LOCKED`): a run that
     * meets a rule being made, or changed, leaves it for the next.
     */
    readonly lockUnlessHeld: (
      ruleId: RecyclingRuleId
    ) => Effect.Effect<Option.Option<RecyclingRule>, DatabaseError>;
    /** The rule of the source that has not ended, if one has. */
    readonly ofSource: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<Option.Option<RecyclingRule>, DatabaseError>;
    /** How many of the workspace's rules are active or paused. */
    readonly countLive: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DatabaseError>;
    readonly list: (
      workspaceId: WorkspaceId,
      page: RulePage
    ) => Effect.Effect<readonly RecyclingRule[], DatabaseError>;
    /**
     * Active rules of every workspace whose latest occurrence's time is
     * `now` or before, by that time then id, after `after`: `limit` at
     * most.
     */
    readonly due: (
      now: DateTime.Utc,
      after: Option.Option<DuePosition>,
      limit: number
    ) => Effect.Effect<readonly RecyclingRule[], DatabaseError>;
    /**
     * How many active rules' latest occurrence's time (a queue's slot
     * included) passed before `before`: those a run makes, unless it
     * leaves them.
     */
    readonly overdue: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/publishing/application/RecyclingStore") {}
