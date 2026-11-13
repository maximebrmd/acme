import { Context, DateTime, Effect, Layer, Option } from "effect";

import { AccountsNotMerged } from "#billing/domain/accounts-not-merged.ts";
import { BillingAccountNotFound } from "#billing/domain/billing-account-not-found.ts";
import type {
  BillingAccount,
  BillingAccountId,
} from "#billing/domain/billing-account.ts";
import { entitles, stillBills } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { BillingAccounts } from "./billing-accounts.ts";
import { AccountChannels } from "./ports/account-channels.ts";
import type { PlatformAccount } from "./ports/account-channels.ts";
import { AccountDeskAudit } from "./ports/account-desk-audit.ts";
import { BillingAccountStore } from "./ports/billing-account-store.ts";
import { Subscriptions } from "./ports/subscriptions.ts";

/** A billing account, as staff see it: ids and counts only. */
export interface DeskAccount {
  readonly account: BillingAccount;
  /** Whether its billing workspace's subscription gives it a plan now. */
  readonly subscribed: boolean;
  readonly workspaceIds: readonly WorkspaceId[];
}

/** A platform account under several free billing accounts. */
export interface SharedAccount extends PlatformAccount {
  /** Each free account, with how many of its workspaces hold it. */
  readonly accounts: readonly {
    readonly accountId: BillingAccountId;
    readonly workspaces: number;
  }[];
}

/** A page of them, and where the next starts. */
export interface SharedPage {
  readonly items: readonly SharedAccount[];
  readonly next: Option.Option<PlatformAccount>;
}

/** A staff member acting on an account, and why. */
export interface Acting {
  readonly reason: string;
  readonly staffId: UserId;
}

/**
 * What staff do about one free tier per person: the platform accounts
 * connected under two free billing accounts or more (the one signal that
 * needs no new personal data), merging one account into another, and
 * requiring a payment method of one, or giving its free tier back. Each
 * action is recorded in the audit log first, ids only, and is undone:
 * a merge by transfers, a requirement by its opposite. Its callers are
 * staff, which the API's StaffAccess checked.
 */
export class BillingAccountDesk extends Context.Service<
  BillingAccountDesk,
  {
    readonly sharedChannels: (
      after: Option.Option<PlatformAccount>,
      limit: number
    ) => Effect.Effect<SharedPage, DatabaseError>;
    readonly account: (
      named:
        | { readonly accountId: BillingAccountId }
        | { readonly workspaceId: WorkspaceId }
    ) => Effect.Effect<DeskAccount, BillingAccountNotFound | DatabaseError>;
    readonly merge: (
      merging: Acting & {
        readonly from: BillingAccountId;
        readonly into: BillingAccountId;
      }
    ) => Effect.Effect<
      DeskAccount,
      AccountsNotMerged | BillingAccountNotFound | DatabaseError
    >;
    readonly requirePaymentMethod: (
      requiring: Acting & {
        readonly accountId: BillingAccountId;
        readonly required: boolean;
      }
    ) => Effect.Effect<DeskAccount, BillingAccountNotFound | DatabaseError>;
  }
>()("peal-server/billing/application/BillingAccountDesk") {
  static readonly layer = Layer.effect(
    BillingAccountDesk,
    Effect.gen(function* BillingAccountDeskLive() {
      const accounts = yield* BillingAccounts;
      const store = yield* BillingAccountStore;
      const subscriptions = yield* Subscriptions;
      const channels = yield* AccountChannels;
      const audit = yield* AccountDeskAudit;
      const { transaction } = yield* TransactionRunner;

      const found = (accountId: BillingAccountId) =>
        store.get(accountId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new BillingAccountNotFound()),
              onSome: Effect.succeed,
            })
          )
        );

      const described = Effect.fn("BillingAccountDesk.described")(
        function* described(account: BillingAccount) {
          const [workspaceIds, held] = yield* Effect.all([
            store.workspacesOf(account.id),
            subscriptions.ofWorkspace(account.holder),
          ]);

          const desk: DeskAccount = {
            account,
            subscribed: held.some(entitles),
            workspaceIds,
          };

          return desk;
        }
      );

      const sharedChannels = Effect.fn("BillingAccountDesk.sharedChannels")(
        function* sharedChannels(
          after: Option.Option<PlatformAccount>,
          limit: number
        ) {
          const page = yield* channels.sharedPage(after, limit);

          const held = yield* accounts.accountsIn([
            ...new Set(page.flatMap(({ workspaceIds }) => workspaceIds)),
          ]);

          const holders = [
            ...new Set([...held.values()].map(({ holder }) => holder)),
          ];

          const subscribed = yield* subscriptions.ofWorkspaces(holders);

          // An account is free while its billing workspace has no
          // subscription that entitles it.
          const free = (account: BillingAccount) =>
            !(subscribed.get(account.holder) ?? []).some(entitles);

          const items = page.flatMap(
            ({ accountId, platform, workspaceIds }): SharedAccount[] => {
              const counted = new Map<BillingAccountId, number>();

              for (const workspaceId of workspaceIds) {
                const account = held.get(workspaceId);

                if (account !== undefined && free(account)) {
                  counted.set(account.id, (counted.get(account.id) ?? 0) + 1);
                }
              }

              return counted.size < 2
                ? []
                : [
                    {
                      accountId,
                      accounts: [...counted]
                        .map(([id, workspaces]) => ({
                          accountId: id,
                          workspaces,
                        }))
                        .toSorted((a, b) =>
                          a.accountId.localeCompare(b.accountId)
                        ),
                      platform,
                    },
                  ];
            }
          );

          const last = page.at(-1);

          const shared: SharedPage = {
            items,
            next:
              page.length < limit || last === undefined
                ? Option.none()
                : Option.some({
                    accountId: last.accountId,
                    platform: last.platform,
                  }),
          };

          return shared;
        }
      );

      const account = Effect.fn("BillingAccountDesk.account")(function* account(
        named:
          | { readonly accountId: BillingAccountId }
          | { readonly workspaceId: WorkspaceId }
      ) {
        if ("accountId" in named) {
          return yield* described(yield* found(named.accountId));
        }

        const of = yield* store.accountOf(named.workspaceId);

        if (Option.isNone(of)) {
          return yield* new BillingAccountNotFound();
        }

        return yield* described(of.value);
      });

      const merge = Effect.fn("BillingAccountDesk.merge")(function* merge({
        from,
        into,
        reason,
        staffId,
      }: Acting & {
        readonly from: BillingAccountId;
        readonly into: BillingAccountId;
      }) {
        if (from === into) {
          return yield* new AccountsNotMerged({ reason: "same" });
        }

        const merged = yield* transaction(
          Effect.gen(function* merging() {
            // Both held, in the order of their ids, as transfers hold them.
            yield* Effect.forEach(
              [from, into].toSorted(),
              (id) => store.holdAccount(id),
              { discard: true }
            );

            const [source, target] = yield* Effect.all([
              found(from),
              found(into),
            ]);

            if (
              Option.isSome(source.partnerId) ||
              Option.isSome(target.partnerId)
            ) {
              return yield* new AccountsNotMerged({ reason: "partner" });
            }

            if (target.standalone) {
              return yield* new AccountsNotMerged({ reason: "standalone" });
            }

            const moving = yield* store.workspacesOf(source.id);

            const billed = yield* subscriptions.ofWorkspaces(moving);

            if ([...billed.values()].some((held) => held.some(stillBills))) {
              return yield* new AccountsNotMerged({ reason: "subscribed" });
            }

            const now = yield* DateTime.now;

            yield* audit.handled({
              accountId: source.id,
              action: "merge",
              at: now,
              intoAccountId: Option.some(target.id),
              reason,
              staffId,
            });

            yield* Effect.forEach(
              moving,
              (workspaceId) => store.attach(workspaceId, target.id, now, true),
              { discard: true }
            );

            yield* store.delete(source.id);

            return target;
          })
        );

        return yield* described(merged);
      });

      const requirePaymentMethod = Effect.fn(
        "BillingAccountDesk.requirePaymentMethod"
      )(function* requirePaymentMethod({
        accountId,
        reason,
        required,
        staffId,
      }: Acting & {
        readonly accountId: BillingAccountId;
        readonly required: boolean;
      }) {
        const changed = yield* transaction(
          Effect.gen(function* requiring() {
            yield* store.holdAccount(accountId);

            const current = yield* found(accountId);

            yield* audit.handled({
              accountId,
              action: required ? "requirePaymentMethod" : "restoreFreeTier",
              at: yield* DateTime.now,
              intoAccountId: Option.none(),
              reason,
              staffId,
            });

            yield* store.setFreeTier(accountId, !required);

            return yield* found(current.id);
          })
        );

        return yield* described(changed);
      });

      return BillingAccountDesk.of({
        account,
        merge,
        requirePaymentMethod,
        sharedChannels,
      });
    })
  );
}
