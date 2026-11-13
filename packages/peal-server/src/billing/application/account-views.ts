import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { AccountTransfer } from "#billing/domain/account-transfer.ts";
import type { BillingAccount } from "#billing/domain/billing-account.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BillingAccounts } from "./billing-accounts.ts";
import { AccountPayers } from "./ports/account-payers.ts";
import { BillingAccountStore } from "./ports/billing-account-store.ts";

/** Another workspace of the account, which the reader is a member of. */
export interface SharedWorkspace {
  readonly name: string;
  readonly workspaceId: WorkspaceId;
}

/** A workspace's billing account, as a reader of it is told. */
export interface AccountView {
  readonly account: BillingAccount;
  /** The billing workspace's name, for a member of it. */
  readonly holderName: Option.Option<string>;
  /** The account's other workspaces the reader is a member of. */
  readonly others: readonly SharedWorkspace[];
  /** Whether the reader, in person or through an application, pays. */
  readonly payer: boolean;
  /**
   * The open offer to hand the workspace to another payer, for its payer
   * and the one it is offered to.
   */
  readonly transfer: Option.Option<AccountTransfer>;
  /** How many workspaces the account holds. */
  readonly workspaces: number;
}

/**
 * Whose account a workspace is on, for its billing page and its
 * standing: the account, its billing workspace, and the account's other
 * workspaces, each named only to a member of it. Holds nothing: it reports
 * a state. No permission beyond membership, which the API checked.
 */
export class AccountViews extends Context.Service<
  AccountViews,
  {
    readonly of: (actor: Actor) => Effect.Effect<AccountView, DatabaseError>;
  }
>()("peal-server/billing/application/AccountViews") {
  static readonly layer = Layer.effect(
    AccountViews,
    Effect.gen(function* AccountViewsLive() {
      const accounts = yield* BillingAccounts;
      const payers = yield* AccountPayers;
      const store = yield* BillingAccountStore;

      const of = Effect.fn("AccountViews.of")(function* of(actor: Actor) {
        // Read without the account's hold: it reports a state, and a page
        // would queue behind every connection.
        const pools = yield* accounts.poolsIn([actor.workspaceId]);
        const pool = pools.get(actor.workspaceId);

        if (pool === undefined) {
          return yield* Effect.die("A workspace read has no billing account");
        }

        const { account } = pool;
        const { subject } = actor;

        // A partner's pool as the workspace context holds it: its
        // workspaces join the partner's account as they are read.
        const others = Option.isSome(account.partnerId)
          ? Option.getOrElse(
              yield* payers.partnerPoolOf(actor.workspaceId),
              () => pool.others
            )
          : pool.others;

        const reader =
          subject._tag === "user" ? Option.some(subject.userId) : Option.none();

        const names = yield* Option.match(reader, {
          onNone: () => Effect.succeed(new Map<WorkspaceId, string>()),
          onSome: (userId) =>
            payers.namesShownTo(userId, [account.holder, ...others]),
        });

        const payer = Option.exists(reader, (userId) =>
          Option.contains(account.payer, userId)
        );

        const now = yield* DateTime.now;

        // An offer to its two people, while it is open.
        const transfer = (yield* store.transferOf(actor.workspaceId)).pipe(
          Option.filter(
            (offered) =>
              DateTime.isGreaterThan(offered.expiresAt, now) &&
              Option.exists(
                reader,
                (userId) =>
                  userId === offered.offeredBy || userId === offered.toUserId
              )
          )
        );

        const shown = others.flatMap((workspaceId) => {
          const name = names.get(workspaceId);

          return name === undefined ? [] : [{ name, workspaceId }];
        });

        const view: AccountView = {
          account,
          holderName: Option.fromUndefinedOr(names.get(account.holder)),
          others: shown,
          payer,
          transfer,
          // A partner's account tells nobody how many customers it holds:
          // only the workspaces the reader is a member of.
          workspaces: Option.isSome(account.partnerId)
            ? shown.length + 1
            : others.length + 1,
        };

        return view;
      });

      return AccountViews.of({ of });
    })
  );
}
