import { Context, Effect, Layer, Option } from "effect";

import { BillingOff } from "#billing/domain/billing-off.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import { ReductionRefused } from "#billing/domain/reduction-refused.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { WorkspaceHoldings } from "./ports/workspace-holdings.ts";
import { WorkspaceStanding } from "./workspace-standing.ts";
import type { Standing } from "./workspace-standing.ts";

/** What stays in a workspace that must come back within its plan. */
export interface Kept {
  readonly keepChannelIds: readonly string[];
  readonly keepMemberIds: readonly string[];
}

/** What choosing did, and where the workspace then stands. */
export interface Reduction {
  readonly disconnectedChannels: number;
  readonly removedMembers: number;
  readonly revokedInvitations: number;
  readonly standing: Standing;
}

/**
 * Brings a workspace over its plan back within it, by keeping what a
 * member chose: the channels kept stay connected and the others are
 * disconnected, the members kept stay and the others are removed, with the
 * pending invitations revoked. Only what is over the plan is touched: a
 * workspace within its plan's members keeps them all, whatever the choice
 * says of them. The whole choice is checked first, and members go before
 * channels, so a choice refused changes nothing; disconnecting then asks
 * each platform to forget Peal, one channel at a time, and can be asked
 * again if it stops midway. Posts scheduled on a channel disconnected fail
 * when due, as for any channel disconnected. Needs billing:manage, with
 * channel:disconnect, member:delete and invitation:cancel for what it
 * removes, and the member in person.
 */
export class ReduceWorkspace extends Context.Service<
  ReduceWorkspace,
  {
    readonly keep: (
      actor: Actor,
      kept: Kept
    ) => Effect.Effect<
      Reduction,
      | BillingOff
      | DatabaseError
      | MissingPermission
      | PersonRequired
      | ReductionRefused
    >;
  }
>()("peal-server/billing/application/ReduceWorkspace") {
  static readonly layer = Layer.effect(
    ReduceWorkspace,
    Effect.gen(function* ReduceWorkspaceLive() {
      const standings = yield* WorkspaceStanding;
      const holdings = yield* WorkspaceHoldings;

      const keep = Effect.fn("ReduceWorkspace.keep")(function* keep(
        actor: Actor,
        kept: Kept
      ) {
        yield* Effect.fromResult(authorize(actor, "billing:manage"));
        yield* Effect.fromResult(inPerson(actor));

        const before = yield* standings.of(actor);

        if (Option.isNone(before.plan)) {
          return yield* new BillingOff();
        }

        const allowedOf = (limit: "channels" | "members") =>
          Option.fromUndefinedOr(
            before.over.find((excess) => excess.limit === limit)
          ).pipe(Option.map(({ allowed }) => allowed));

        const channelsAllowed = allowedOf("channels");
        const membersAllowed = allowedOf("members");

        // The channels to disconnect, once the choice is known to fit.
        const leaving = yield* Option.match(channelsAllowed, {
          onNone: () => Effect.succeed<readonly string[]>([]),
          onSome: Effect.fnUntraced(function* channelsLeaving(allowed) {
            yield* Effect.fromResult(authorize(actor, "channel:disconnect"));

            const connected = yield* holdings.channels(actor);
            const staying = new Set(kept.keepChannelIds);

            if ([...staying].some((id) => !connected.includes(id))) {
              return yield* new ReductionRefused({ reason: "unknownChannel" });
            }

            if (staying.size > allowed) {
              return yield* new ReductionRefused({
                reason: "tooManyChannels",
              });
            }

            return connected.filter((id) => !staying.has(id));
          }),
        });

        const members = yield* Option.match(membersAllowed, {
          onNone: () => Effect.succeed({ removed: 0, revoked: 0 }),
          onSome: (allowed) =>
            new Set(kept.keepMemberIds).size > allowed
              ? Effect.fail(new ReductionRefused({ reason: "tooManyMembers" }))
              : holdings.keepMembers(actor, kept.keepMemberIds),
        });

        yield* Effect.forEach(
          leaving,
          (channelId) => holdings.disconnect(actor, channelId),
          { discard: true }
        );

        const reduction: Reduction = {
          disconnectedChannels: leaving.length,
          removedMembers: members.removed,
          revokedInvitations: members.revoked,
          standing: yield* standings.of(actor),
        };

        return reduction;
      });

      return ReduceWorkspace.of({ keep });
    })
  );
}
