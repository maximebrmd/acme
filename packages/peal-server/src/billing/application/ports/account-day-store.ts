import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { AccountDay } from "#billing/domain/account-days.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * One meter event for Stripe, as the outbox keeps it: its identifier
 * (Stripe's, derived from the fact it reports), whose usage it is (the
 * holder, and its Stripe customer), the meter's event name, the units and
 * the instant they describe.
 */
export interface MeterReport {
  readonly createdAt: DateTime.Utc;
  readonly eventName: string;
  readonly holder: WorkspaceId;
  readonly identifier: string;
  readonly occurredAt: DateTime.Utc;
  readonly stripeCustomerId: string;
  readonly value: number;
}

/** A report waiting to be sent, with its stamp once first attempted. */
export interface UnsentReport extends MeterReport {
  readonly stampedAt: Option.Option<DateTime.Utc>;
}

/** Where the reporter's pages of unsent reports go on from. */
export interface ReportCursor {
  readonly createdAt: DateTime.Utc;
  readonly identifier: string;
}

/** A holder's day, raised to `count` connected accounts. */
export interface PeakRaise {
  readonly count: number;
  readonly holder: WorkspaceId;
}

/** What the outbox holds that was not sent. */
export interface ReportBacklog {
  /** Neither sent nor refused for good. */
  readonly left: number;
  readonly oldest: Option.Option<DateTime.Utc>;
  /** Refused for good, before Stripe took them or after. */
  readonly refused: number;
}

/**
 * The billing accounts' connected accounts by day, on their holders, and
 * the outbox of meter events to Stripe, in the billing schema.
 */
export class AccountDayStore extends Context.Service<
  AccountDayStore,
  {
    /**
     * Raises each holder's row of `day` to its count, in one statement
     * (writing it when missing; a lower count changes nothing), and
     * answers the rows as they now stand. In a transaction, each row stays
     * held until it ends, so raises of one holder take turns.
     */
    readonly raise: (
      day: DateTime.Utc,
      counts: readonly PeakRaise[]
    ) => Effect.Effect<readonly AccountDay[], DatabaseError>;
    /**
     * Puts these reports in the outbox (one already there is left as it
     * is) and records what each day has reported, in the caller's
     * transaction.
     */
    readonly enqueue: (
      reports: readonly MeterReport[],
      reported: readonly Pick<AccountDay, "day" | "holder" | "reported">[]
    ) => Effect.Effect<void, DatabaseError>;
    /** The holders' days from `from` to `to`, both included. */
    readonly ofHolders: (
      holders: readonly WorkspaceId[],
      period: { readonly from: DateTime.Utc; readonly to: DateTime.Utc }
    ) => Effect.Effect<readonly AccountDay[], DatabaseError>;
    /**
     * Reports neither sent nor refused, oldest first (then by
     * identifier), after `after`, `limit` at most.
     */
    readonly unsent: (
      after: Option.Option<ReportCursor>,
      limit: number
    ) => Effect.Effect<readonly UnsentReport[], DatabaseError>;
    /**
     * Fixes the report's stamp at `at`, unless an earlier attempt fixed
     * one: the stamp it keeps.
     */
    readonly stamp: (
      identifier: string,
      at: DateTime.Utc
    ) => Effect.Effect<DateTime.Utc, DatabaseError>;
    /** Marks sent the reports neither sent nor refused already. */
    readonly markSent: (
      identifiers: readonly string[],
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** Keeps Stripe's error code of a report it refused for good. */
    readonly markRefused: (
      identifier: string,
      refusal: string
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Keeps `refusal` on the reports named, sent or not, that none was
     * kept on: how many.
     */
    readonly markDropped: (
      identifiers: readonly string[],
      refusal: string
    ) => Effect.Effect<number, DatabaseError>;
    /** How many reports wait, and since when the oldest. */
    readonly backlog: Effect.Effect<ReportBacklog, DatabaseError>;
    /**
     * Deletes the days before `cutoff`, and the reports sent before it (or
     * written before it, never sent): how many rows in all.
     */
    readonly purgeBefore: (
      cutoff: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /** Deletes the workspace's days and reports, in the caller's transaction. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** Every day and report the workspace holds, for its export. */
    readonly allOf: (workspaceId: WorkspaceId) => Effect.Effect<
      {
        readonly days: readonly AccountDay[];
        readonly reports: readonly (MeterReport & {
          readonly sentAt: Option.Option<DateTime.Utc>;
        })[];
      },
      DatabaseError
    >;
  }
>()("peal-server/billing/application/AccountDayStore") {}
