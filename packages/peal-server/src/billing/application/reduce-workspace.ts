import { Context, Effect, Layer, Option } from "effect";

import { BillingOff } from "#billing/domain/billing-off.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import { ReductionRefused } from "#billing/domain/reduction-refused.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { BillingAccounts } from "./billing-accounts.ts";
import { AccountPayers } from "./ports/account-payers.ts";
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
 * channels, so a choice refused changes nothing. Channels are counted
 * across the workspace's billing account: a choice is taken when it brings
 * the account within its plan, or disconnects every channel of this
 * workspace. The owner who pays for the workspace stays among the members
 * kept (`payerRequired`). Disconnecting then asks
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
      const accounts = yield* BillingAccounts;
      const payers = yield* AccountPayers;

      // The owner who pays for the workspace stays among its members until
      // they hand it to another payer.
      const keepsPayer = Effect.fn("ReduceWorkspace.keepsPayer")(
        function* keepsPayer(actor: Actor, kept: readonly string[]) {
          const { payer } = yield* accounts.of(actor.workspaceId);

          if (Option.isNone(payer) || kept.includes(payer.value)) {
            return true;
          }

          return !(yield* payers.ownersOf(actor.workspaceId)).includes(
            payer.value
          );
        }
      );

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

        // The request was let in as a member's, perhaps before another
        // member's choice removed them: the standing just read is then
        // what that choice left, within the plan's members, and nothing
        // below would find them gone. Read after the standing, so a
        // removal the standing shows is one this sees too. Such a member
        // is told so, never that a choice of theirs was applied, and
        // disconnects nothing.
        if (!(yield* holdings.present(actor))) {
          return yield* new ReductionRefused({ reason: "unknownMember" });
        }

        const excessOf = (limit: "channels" | "members") =>
          Option.fromUndefinedOr(
            before.over.find((excess) => excess.limit === limit)
          );

        const channelsOver = excessOf("channels");

        const membersAllowed = excessOf("members").pipe(
          Option.map(({ allowed }) => allowed)
        );

        // The channels to disconnect, once the choice is known to fit.
        const leaving = yield* Option.match(channelsOver, {
          onNone: () => Effect.succeed<readonly string[]>([]),
          onSome: Effect.fnUntraced(function* channelsLeaving({
            allowed,
            used,
          }) {
            yield* Effect.fromResult(authorize(actor, "channel:disconnect"));

            const connected = yield* holdings.channels(actor);
            const staying = new Set(kept.keepChannelIds);

            if ([...staying].some((id) => !connected.includes(id))) {
              return yield* new ReductionRefused({ reason: "unknownChannel" });
            }

            // The channels the other workspaces of its billing account (or
            // partner pool) hold count with these: a choice brings the
            // account within its plan, or disconnects everything here.
            const elsewhere = Math.max(used - connected.length, 0);

            if (staying.size > 0 && staying.size + elsewhere > allowed) {
              return yield* new ReductionRefused({
                reason: "tooManyChannels",
              });
            }

            return connected.filter((id) => !staying.has(id));
          }),
        });

        const members = yield* Option.match(membersAllowed, {
          onNone: () => Effect.succeed({ removed: 0, revoked: 0 }),
          onSome: Effect.fnUntraced(function* membersKept(allowed) {
            if (new Set(kept.keepMemberIds).size > allowed) {
              return yield* new ReductionRefused({ reason: "tooManyMembers" });
            }

            if (!(yield* keepsPayer(actor, kept.keepMemberIds))) {
              return yield* new ReductionRefused({ reason: "payerRequired" });
            }

            return yield* holdings.keepMembers(actor, kept.keepMemberIds);
          }),
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
