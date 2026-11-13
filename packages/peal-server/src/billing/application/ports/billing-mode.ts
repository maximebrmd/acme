import { Context, DateTime, Option } from "effect";

/**
 * Whether this server bills workspaces. A server without a Stripe key does
 * not: no plan, no limit, as a self-hosted server runs. `graceUntil`
 * (PEAL_BILLING_GRACE_UNTIL): until then, a workspace on the free tier
 * over its free accounts, as every workspace made before billing was
 * turned on may be, still schedules and publishes on the channels it had
 * connected before `graceSince`, when this server first ran with that
 * day; it connects nothing more.
 */
export class BillingMode extends Context.Service<
  BillingMode,
  {
    readonly enabled: boolean;
    readonly graceUntil: Option.Option<DateTime.Utc>;
    /** When this server first ran with `graceUntil`; none without one. */
    readonly graceSince: Option.Option<DateTime.Utc>;
  }
>()("peal-server/billing/application/BillingMode") {}

/** Whether the grace `graceUntil` sets still runs at `now`. */
export const inGrace = (
  graceUntil: Option.Option<DateTime.Utc>,
  now: DateTime.Utc
): boolean =>
  Option.exists(graceUntil, (until) => DateTime.isLessThan(now, until));
