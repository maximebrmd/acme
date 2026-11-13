import { Context, DateTime, Effect, Layer, Option } from "effect";

import { AccountsNotMerged } from "#billing/domain/accounts-not-merged.ts";
import { BillingAccountNotFound } from "#billing/domain/billing-account-not-found.ts";
import type {
  BillingAccount,
  BillingAccountId,
} from "#billing/domain/billing-account.ts";
import { entitles, stillBills } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Pseudonyms } from "#shared/application/pseudonyms.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { BillingAccounts } from "./billing-accounts.ts";
import { AccountChannels } from "./ports/account-channels.ts";
import type { PlatformAccount } from "./ports/account-channels.ts";
import { AccountDeskAudit } from "./ports/account-desk-audit.ts";
import { AccountPayers } from "./ports/account-payers.ts";
import { BillingAccountStore } from "./ports/billing-account-store.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { StartAccountDays } from "./start-account-days.ts";

/** A billing account, as staff see it: ids and counts only. */
export interface DeskAccount {
  readonly account: BillingAccount;
  /** Those of its workspaces staff merged into it. */
  readonly merged: readonly WorkspaceId[];
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
    /**
     * Takes the workspace out of its account, back on its oldest owner's:
     * undoes a merge, one workspace at a time.
     */
    readonly detach: (
      detaching: Acting & { readonly workspaceId: WorkspaceId }
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
      const days = yield* StartAccountDays;

      // The account a workspace moved into holds its accounts from today;
      // a raise that fails is made good by the next hourly start.
      const raisedDay = (accountId: BillingAccountId) =>
        days
          .raiseAccount(accountId)
          .pipe(
            Effect.catchCause((cause) =>
              Effect.logWarning(
                "Raising the day of the account a workspace moved into failed",
                cause
              )
            )
          );

      const payers = yield* AccountPayers;
      const pseudonyms = yield* Pseudonyms;

      // Forgets a requirement of the person, by id and by address.
      const releaseFor = (payer: UserId) =>
        Effect.gen(function* releasePayer() {
          const email = yield* payers.emailOf(payer);

          const pseudonym = Option.isSome(email)
            ? Option.some(yield* pseudonyms.ofEmail(email.value))
            : Option.none<string>();

          yield* store.releasePayment(payer, pseudonym);
        });

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

          const merged = yield* store.mergedIn(workspaceIds);

          const desk: DeskAccount = {
            account,
            merged: workspaceIds.filter((id) => merged.has(id)),
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
              moved: moving,
              reason,
              staffId,
              workspaceId: Option.none(),
            });

            yield* Effect.forEach(
              moving,
              (workspaceId) =>
                store.attach(workspaceId, target.id, now, {
                  fromPayer: source.payer,
                }),
              { discard: true }
            );

            yield* store.delete(source.id);

            // Its workspaces bring no free tier with them, and the person
            // it was merged into keeps none either, whatever becomes of
            // this account.
            if (!source.freeTier) {
              yield* store.setFreeTier(target.id, false);

              if (Option.isSome(target.payer)) {
                yield* store.requirePayment(target.payer.value, now);
              }
            }

            return yield* found(target.id);
          })
        );

        yield* raisedDay(merged.id);

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
              workspaceId: Option.none(),
            });

            yield* store.setFreeTier(accountId, !required);

            // Kept by the person too, so no account they make later has a
            // free tier: their next one reads it.
            if (Option.isSome(current.payer)) {
              const payer = current.payer.value;

              yield* required
                ? store.requirePayment(payer, yield* DateTime.now)
                : releaseFor(payer);
            }

            return yield* found(current.id);
          })
        );

        return yield* described(changed);
      });

      const detach = Effect.fn("BillingAccountDesk.detach")(function* detach({
        reason,
        staffId,
        workspaceId,
      }: Acting & { readonly workspaceId: WorkspaceId }) {
        yield* transaction(
          Effect.gen(function* detaching() {
            const current = yield* store.accountOf(workspaceId);

            if (Option.isNone(current)) {
              return yield* new BillingAccountNotFound();
            }

            const held = current.value;

            if (Option.isSome(held.partnerId)) {
              return yield* new AccountsNotMerged({ reason: "partner" });
            }

            if (
              held.holder === workspaceId &&
              (yield* subscriptions.ofWorkspace(workspaceId)).some(stillBills)
            ) {
              return yield* new AccountsNotMerged({ reason: "subscribed" });
            }

            yield* audit.handled({
              accountId: held.id,
              action: "detach",
              at: yield* DateTime.now,
              intoAccountId: Option.none(),
              reason,
              staffId,
              workspaceId: Option.some(workspaceId),
            });

            // Back to who paid for it before the merge while they own it,
            // else to its oldest owner's account, read next. Payers held in
            // the order of their ids.
            const before = yield* store.mergedFrom(workspaceId);
            const owners = yield* payers.ownersOf(workspaceId);

            const back = before.pipe(
              Option.filter((payer) => owners.includes(payer))
            );

            yield* Effect.forEach(
              [
                ...Option.toArray(held.payer),
                ...Option.toArray(back),
              ].toSorted(),
              (payer) => store.holdPayer(payer),
              { discard: true }
            );

            return yield* Option.match(back, {
              onNone: () => accounts.leave(workspaceId, held),
              onSome: (payer) =>
                accounts.moveTo(workspaceId, held, payer).pipe(Effect.asVoid),
            });
          })
        );

        // The account it is on now: its previous payer's, or its oldest
        // owner's, given as to a workspace read for the first time.
        const now = yield* accounts.of(workspaceId);

        yield* raisedDay(now.id);

        return yield* described(now);
      });

      return BillingAccountDesk.of({
        account,
        detach,
        merge,
        requirePaymentMethod,
        sharedChannels,
      });
    })
  );
}
