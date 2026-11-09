import { Context } from "effect";

/**
 * Whether this server bills workspaces. A server without a Stripe key does
 * not: no plan, no limit, as a self-hosted server runs.
 */
export class BillingMode extends Context.Service<
  BillingMode,
  { readonly enabled: boolean }
>()("peal-server/billing/application/BillingMode") {}
