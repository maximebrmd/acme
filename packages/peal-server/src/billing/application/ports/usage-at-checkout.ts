import { Context, Effect, Layer, Option, Ref } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { Usage, WorkspaceUsage } from "./workspace-usage.ts";

/**
 * What a workspace holds when a checkout starts, so an order it has
 * outgrown since starts none. The counts come from the contexts that hold
 * them (`WorkspaceUsage`), which are built after the sign-in service whose
 * checkout asks: the billing page's layer binds them once they are, and
 * until then nothing is known (`none`), which starts no checkout.
 */
export class UsageAtCheckout extends Context.Service<
  UsageAtCheckout,
  {
    /** Hands over the counts, once the contexts that hold them are built. */
    readonly bind: (usage: WorkspaceUsage["Service"]) => Effect.Effect<void>;
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<Usage>, DatabaseError>;
  }
>()("peal-server/billing/application/UsageAtCheckout") {
  static readonly layer = Layer.effect(
    UsageAtCheckout,
    Ref.make(Option.none<WorkspaceUsage["Service"]>()).pipe(
      Effect.map((bound) =>
        UsageAtCheckout.of({
          bind: (usage) => Ref.set(bound, Option.some(usage)),
          of: (workspaceId) =>
            Ref.get(bound).pipe(
              Effect.flatMap(
                Option.match({
                  onNone: () => Effect.succeedNone,
                  onSome: (usage) =>
                    usage.of(workspaceId).pipe(Effect.map(Option.some)),
                })
              )
            ),
        })
      )
    )
  );
}
