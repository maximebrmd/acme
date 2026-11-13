import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { BillingAccountId } from "#billing/domain/billing-account.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { AccountDays } from "./account-days.ts";
import { AccountChannels } from "./ports/account-channels.ts";
import type { PeakRaise } from "./ports/account-day-store.ts";
import { BillingAccountStore } from "./ports/billing-account-store.ts";
import { BillingMode } from "./ports/billing-mode.ts";

/** How many billing accounts one batch reads and raises. */
export const startBatchSize = 500;

/**
 * Starts the day (UTC) of every billing account that holds accounts: its
 * billing workspace's row for today raised to the channels its workspaces
 * connected now, reported for those that pay, as a connection would. It
 * goes through the accounts by id, a batch at a time: three reads (the
 * accounts, their workspaces, their channels) and one transaction a
 * batch, whatever their number. Raising keeps the higher count, so a
 * second run, or one late in the day, changes nothing more; a day never
 * started is made good by its first connection. A server that does not
 * bill starts nothing.
 */
export class StartAccountDays extends Context.Service<
  StartAccountDays,
  {
    /** How many holders' days it raised. */
    readonly run: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/billing/application/StartAccountDays") {
  static readonly make = (batchSize: number) =>
    Layer.effect(
      StartAccountDays,
      Effect.gen(function* StartAccountDaysLive() {
        const { enabled } = yield* BillingMode;
        const store = yield* BillingAccountStore;
        const channels = yield* AccountChannels;
        const days = yield* AccountDays;

        const run = Effect.gen(function* run() {
          if (!enabled) {
            return 0;
          }

          const now = yield* DateTime.now;
          let after = Option.none<BillingAccountId>();
          let more = true;
          let raised = 0;

          while (more) {
            const page = yield* store.page(after, batchSize);

            const held = yield* store.workspacesOfEach(
              page.map(({ id }) => id)
            );

            const counts = yield* channels.ownIn([
              ...new Set([...held.values()].flat()),
            ]);

            const raises = page.flatMap((account): readonly PeakRaise[] => {
              let count = 0;

              for (const workspaceId of held.get(account.id) ?? []) {
                count += counts.get(workspaceId) ?? 0;
              }

              return count > 0 ? [{ count, holder: account.holder }] : [];
            });

            yield* days.raise(now, raises);

            raised += raises.length;
            more = page.length === batchSize;
            after = Option.fromUndefinedOr(page.at(-1)?.id);
          }

          return raised;
        }).pipe(Effect.withSpan("StartAccountDays.run"));

        return StartAccountDays.of({ run });
      })
    );

  static readonly layer = StartAccountDays.make(startBatchSize);
}
