// Settling deletions at Stripe before their transaction: nothing is
// cancelled while anything else would refuse, every subscription the
// person would cancel is listed at once, and the transaction itself never
// cancels.
import { assert, layer } from "@effect/vitest";
import { Context, Effect, Layer, Option, Ref } from "effect";

import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import { UsageRecords } from "#assistant/application/ports/usage-records.ts";
import { BillingRecords } from "#billing/application/billing-records.ts";
import { WorkspaceStillBilled } from "#billing/application/workspace-still-billed.ts";
import { ChannelRecords } from "#channels/application/channel-records.ts";
import { LegalRecords } from "#legal/application/legal-records.ts";
import { MediaRecords } from "#media/application/media-records.ts";
import { NoticeRecords } from "#notifications/application/notice-records.ts";
import { PostRecords } from "#publishing/application/post-records.ts";
import { PostsPublishing } from "#publishing/application/posts-publishing.ts";
import { ReviewRecords } from "#review/application/review-records.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { StaffRecords } from "#staff/application/staff-records.ts";
import { PlainPseudonymsTest } from "#test/billing/support.ts";
import { WebhookRecords } from "#webhooks/application/webhook-records.ts";
import { ContextRecords } from "#workspace/application/context-records.ts";
import { ContextRecordsLive } from "#workspace/infrastructure/context-records.ts";

const harbour = WorkspaceIdSchema.make("5d1c8e2a-3b4f-4a6c-9d7e-8f9a0b1c2d3e");
const meadow = WorkspaceIdSchema.make("6e2d9f3b-4c5a-4b7d-8e8f-9a0b1c2d3e4f");
const going = WorkspaceIdSchema.make("7f3e0a4c-5d6b-4c8e-9f9a-0b1c2d3e4f5a");

// The workspaces billed, and the one with a post going out.
const billed: ReadonlySet<WorkspaceId> = new Set([harbour, meadow]);

class Calls extends Context.Service<
  Calls,
  { readonly made: Ref.Ref<readonly string[]> }
>()("test/workspace/infrastructure/Calls") {
  static readonly layer = Layer.effect(
    Calls,
    Effect.map(Ref.make<readonly string[]>([]), (made) => ({ made }))
  );
}

const RecordsTest = Layer.unwrap(
  Effect.gen(function* records() {
    const { made } = yield* Calls;
    const call = (name: string) => Ref.update(made, (all) => [...all, name]);

    return ContextRecordsLive.pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.mock(PostRecords, {
            ensureErasable: (workspaceId) =>
              workspaceId === going
                ? Effect.fail(new PostsPublishing({ workspaceId }))
                : Effect.void,
            eraseWorkspace: (workspaceId) => call(`posts:${workspaceId}`),
          }),
          Layer.mock(BillingRecords, {
            billedBy: (workspaceId) =>
              Effect.succeed(
                billed.has(workspaceId)
                  ? [{ paidUntil: Option.none(), plan: Option.some("pro") }]
                  : []
              ),
            eraseWorkspace: (workspaceId) => call(`billing:${workspaceId}`),
            settleWorkspace: (workspaceId, options) =>
              options?.cancelSubscriptions === true || !billed.has(workspaceId)
                ? call(`settle:${workspaceId}`).pipe(
                    Effect.as({
                      subscriptionsCancelled: billed.has(workspaceId) ? 1 : 0,
                    })
                  )
                : Effect.fail(
                    new WorkspaceStillBilled({ subscriptions: [], workspaceId })
                  ),
          }),
          Layer.mock(AnalyticsRecords, {
            eraseWorkspace: () => Effect.void,
          }),
          Layer.mock(ChannelRecords, { eraseWorkspace: () => Effect.void }),
          Layer.mock(MediaRecords, { eraseWorkspace: () => Effect.void }),
          Layer.mock(NoticeRecords, { eraseWorkspace: () => Effect.void }),
          Layer.mock(UsageRecords, { eraseWorkspace: () => Effect.void }),
          Layer.mock(ReviewRecords, { eraseWorkspace: () => Effect.void }),
          Layer.mock(WebhookRecords, { eraseWorkspace: () => Effect.void }),
          Layer.mock(StaffRecords, {}),
          Layer.mock(LegalRecords, {})
        )
      )
    );
  })
).pipe(Layer.provide(PlainPseudonymsTest), Layer.provideMerge(Calls.layer));

const made = Calls.use(({ made: calls }) => Ref.getAndSet(calls, []));

layer(RecordsTest)("settling deletions at Stripe", (it) => {
  it.effect(
    "lists every subscription of every workspace, and cancels none, until the person agrees",
    () =>
      Effect.gen(function* refused() {
        const records = yield* ContextRecords;

        const failure = yield* records
          .settleWorkspaces([harbour, meadow], { cancelSubscriptions: false })
          .pipe(Effect.flip);

        assert.deepStrictEqual(failure._tag, "WorkspaceSubscribed");
        assert.deepStrictEqual(
          failure._tag === "WorkspaceSubscribed"
            ? failure.subscriptions.map(({ workspaceId }) => workspaceId)
            : [],
          [harbour, meadow]
        );
        assert.deepStrictEqual(yield* made, []);

        const settled = yield* records.settleWorkspaces([harbour, meadow], {
          cancelSubscriptions: true,
        });

        assert.deepStrictEqual(settled, { subscriptionsCancelled: 2 });
        assert.deepStrictEqual(yield* made, [
          `settle:${harbour}`,
          `settle:${meadow}`,
        ]);
      })
  );

  it.effect("cancels nothing while a post of one of them goes out", () =>
    Effect.gen(function* busy() {
      const records = yield* ContextRecords;

      const failure = yield* records
        .settleWorkspaces([harbour, going], { cancelSubscriptions: true })
        .pipe(Effect.flip);

      assert.strictEqual(failure._tag, "WorkspaceBusy");
      assert.deepStrictEqual(yield* made, []);
    })
  );

  it.effect("erases a settled workspace without asking Stripe to cancel", () =>
    Effect.gen(function* erases() {
      const records = yield* ContextRecords;

      yield* records.eraseWorkspace(harbour);

      assert.deepStrictEqual(yield* made, [
        `posts:${harbour}`,
        `billing:${harbour}`,
      ]);
    })
  );
});
