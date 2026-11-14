import { Context, DateTime, Effect, Layer, Option } from "effect";

import { BillingOff } from "#billing/domain/billing-off.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { MeterUsageStore } from "./ports/meter-usage-store.ts";
import type { XUsageSetting } from "./ports/meter-usage-store.ts";

/**
 * Whether a workspace reads its X channels' counts on a server that
 * bills, where X bills each read and Peal passes it through at X's rates
 * (the `xApi` meter, within the billing account's `x` ceiling): off until
 * a member who manages its billing turns it on, in person, on that
 * workspace; the activity log keeps who. A server that does not bill
 * takes none (`BillingOff`): there, `X_ANALYTICS` decides alone.
 */
export class XReads extends Context.Service<
  XReads,
  {
    readonly set: (
      actor: Actor,
      reads: boolean
    ) => Effect.Effect<
      XUsageSetting,
      BillingOff | DatabaseError | MissingPermission | PersonRequired
    >;
    /** The workspace's setting; none: never set, so off. */
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<XUsageSetting>, DatabaseError>;
    /** Whether the workspace reads X now. */
    readonly on: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/billing/application/XReads") {
  static readonly layer = Layer.effect(
    XReads,
    Effect.gen(function* XReadsLive() {
      const { enabled } = yield* BillingMode;
      const store = yield* MeterUsageStore;

      const set = Effect.fn("XReads.set")(function* set(
        actor: Actor,
        reads: boolean
      ) {
        yield* Effect.fromResult(authorize(actor, "billing:manage"));

        yield* Effect.fromResult(inPerson(actor));

        if (!enabled) {
          return yield* new BillingOff();
        }

        const setting: XUsageSetting = { reads, setAt: yield* DateTime.now };

        yield* store.setXUsage(actor.workspaceId, setting);

        return setting;
      });

      const of = (workspaceId: WorkspaceId) => store.xUsage(workspaceId);

      const on = (workspaceId: WorkspaceId) =>
        of(workspaceId).pipe(Effect.map(Option.exists(({ reads }) => reads)));

      return XReads.of({ of, on, set });
    })
  );
}
