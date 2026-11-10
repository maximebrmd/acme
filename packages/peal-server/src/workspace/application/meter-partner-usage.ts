import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

import { PartnerWorkspaces } from "./partner-workspaces.ts";

/** What a run counted. */
export interface PartnerUsageRun {
  /** The idempotency keys forgotten, past their day. */
  readonly keys: number;
  /** The partner accounts counted. */
  readonly partners: number;
}

/**
 * The daily count of what every partner account holds, its workspaces and
 * the channels connected across them, kept by day (UTC) so a price by the
 * workspace or by the connected channel has its figures; and the end of
 * the day workspace creations' idempotency keys are kept.
 */
export class MeterPartnerUsage extends Context.Service<
  MeterPartnerUsage,
  { readonly run: Effect.Effect<PartnerUsageRun, DatabaseError> }
>()("peal-server/workspace/application/MeterPartnerUsage") {
  static readonly layer = Layer.effect(
    MeterPartnerUsage,
    Effect.gen(function* MeterPartnerUsageLive() {
      const workspaces = yield* PartnerWorkspaces;

      return MeterPartnerUsage.of({
        run: Effect.all({
          keys: workspaces.purgeKeys,
          partners: workspaces.meter,
        }).pipe(Effect.withSpan("MeterPartnerUsage.run")),
      });
    })
  );
}
