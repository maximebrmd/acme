// At start, a server that bills without a grace warns when a workspace on
// the free tier holds more accounts than it includes.
import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Logger, Option } from "effect";

import { GraceWarningLive } from "#billing/application/grace-warning.ts";
import { BillingAccountStore } from "#billing/application/ports/billing-account-store.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { WorkspaceStanding } from "#billing/application/workspace-standing.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { aloneAccountOf, everyWorkspaceOn } from "#test/billing/support.ts";

const over = WorkspaceIdSchema.make("4d5e6f7a-8b9c-4d0e-9f1a-3b4c5d6e7f8a");

const within = WorkspaceIdSchema.make("5e6f7a8b-9c0d-4e1f-8a2b-4c5d6e7f8a9b");

const warningsWith = (graceUntil: Option.Option<never>, enabled = true) =>
  Effect.gen(function* warned() {
    const lines: string[] = [];

    yield* Effect.scoped(
      Layer.build(
        GraceWarningLive.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(
                BillingMode,
                BillingMode.of({ enabled, graceSince: graceUntil, graceUntil })
              ),
              Layer.mock(BillingAccountStore, {
                page: (after) =>
                  Effect.succeed(
                    Option.isNone(after)
                      ? [aloneAccountOf(over), aloneAccountOf(within)]
                      : []
                  ),
              }),
              Layer.mock(WorkspaceStanding, {
                bills: true,
                overPlanIn: () => Effect.succeed(new Set([over])),
              })
            )
          ),
          Layer.provide(everyWorkspaceOn("free"))
        )
      ).pipe(Effect.andThen(Effect.yieldNow))
    ).pipe(
      Effect.provide(
        Logger.layer([
          Logger.make(({ logLevel, message }) => {
            if (logLevel === "Warn") {
              lines.push(String(message));
            }
          }),
        ])
      )
    );

    return lines;
  });

describe("the start's warning without a grace", () => {
  it.effect("names a free tier over its accounts", () =>
    Effect.gen(function* warns() {
      const lines = yield* warningsWith(Option.none());

      assert.lengthOf(lines, 1);
      assert.include(lines[0], "PEAL_BILLING_GRACE_UNTIL");
    })
  );

  it.effect("says nothing on a server that does not bill", () =>
    Effect.gen(function* quiet() {
      assert.deepStrictEqual(yield* warningsWith(Option.none(), false), []);
    })
  );
});
