import { Context, DateTime, Effect, Layer, Option } from "effect";

import {
  BillingAccount,
  BillingAccountIdSchema,
} from "#billing/domain/billing-account.ts";
import { entitles } from "#billing/domain/subscription.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId, Uuid7, WorkspaceId } from "#shared/domain/ids.ts";

import { AccountPayers } from "./ports/account-payers.ts";
import type { PartnerPool } from "./ports/account-payers.ts";
import { BillingAccountStore } from "./ports/billing-account-store.ts";
import { Subscriptions } from "./ports/subscriptions.ts";

/** A workspace's billing account, and the account's other workspaces. */
export interface AccountPool {
  readonly account: BillingAccount;
  /** The account's workspaces but the one asked about. */
  readonly others: readonly WorkspaceId[];
}

// How many times a pool is read again when its workspace moved to another
// account between the read and the hold.
const poolAttempts = 3;

// A plan subscription of the workspace's own that entitles it keeps it
// alone (`standalone`) until it ends.
const entitledBy = (held: readonly Subscription[]): boolean =>
  held.some((subscription) => entitles(subscription));

const make = Effect.gen(function* BillingAccountsLive() {
  const store = yield* BillingAccountStore;
  const payers = yield* AccountPayers;
  const subscriptions = yield* Subscriptions;
  const { transaction } = yield* TransactionRunner;
  const context = yield* Effect.context<Ids>();

  const newAccount = (fields: {
    readonly holder: WorkspaceId;
    readonly partnerId: Option.Option<Uuid7>;
    readonly payer: Option.Option<UserId>;
    readonly standalone: boolean;
  }) =>
    Effect.gen(function* made() {
      const account = new BillingAccount({
        createdAt: yield* DateTime.now,
        freeTier: true,
        id: yield* newId(BillingAccountIdSchema),
        ...fields,
      });

      yield* store.create(account);
      yield* store.attach(fields.holder, account.id, account.createdAt);

      return account;
    }).pipe(Effect.provide(context));

  const entitledAlone = (workspaceId: WorkspaceId) =>
    subscriptions.ofWorkspace(workspaceId).pipe(Effect.map(entitledBy));

  /**
   * Takes the workspace out of its account, under the account's hold: a
   * billing workspace hands the account to the oldest workspace left, and
   * an account left with none goes. Its offers go with it.
   */
  const leave = Effect.fn("BillingAccounts.leave")(function* leave(
    workspaceId: WorkspaceId,
    account: BillingAccount
  ) {
    yield* store.holdAccount(account.id);
    yield* store.detach(workspaceId);
    yield* store.deleteTransfersOf(workspaceId);

    const current = yield* store.get(account.id);

    if (Option.isNone(current) || current.value.holder !== workspaceId) {
      return;
    }

    const remaining = yield* store.workspacesOf(account.id);

    if (remaining.length === 0) {
      yield* store.delete(account.id);

      return;
    }

    const made = yield* payers.madeIn(remaining);

    yield* store.setHolder(
      account.id,
      made[0]?.workspaceId ?? remaining[0] ?? workspaceId
    );
  });

  // A partner's home and the workspaces it owns are the partner's
  // account, whose billing workspace is the home: the partner rule comes
  // first, so a workspace that becomes a partner's leaves the account it
  // was on.
  const resolvePartner = (workspaceId: WorkspaceId, pool: PartnerPool) =>
    transaction(
      Effect.gen(function* partnerResolved() {
        yield* store.holdPartner(pool.partnerId);

        const existing = yield* store.ofPartner(pool.partnerId);

        const account = yield* Option.match(existing, {
          onNone: Effect.fnUntraced(function* partnerAccount() {
            const homeNow = yield* store.accountOf(pool.home);

            if (Option.isSome(homeNow)) {
              yield* leave(pool.home, homeNow.value);
            }

            return yield* newAccount({
              holder: pool.home,
              partnerId: Option.some(pool.partnerId),
              payer: Option.none(),
              standalone: false,
            });
          }),
          onSome: Effect.succeed,
        });

        const now = yield* store.accountOf(workspaceId);

        if (Option.exists(now, ({ id }) => id === account.id)) {
          return account;
        }

        if (Option.isSome(now)) {
          yield* leave(workspaceId, now.value);
        }

        yield* store.holdAccount(account.id);
        yield* store.attach(workspaceId, account.id, yield* DateTime.now);

        return account;
      })
    );

  // A workspace nobody owns, and no partner holds, pays for itself, and
  // nothing is written: one is read so while it is made, before its
  // creator is its member, and is given its account once it is.
  const alone = (workspaceId: WorkspaceId) =>
    Effect.gen(function* aloneAccount() {
      return new BillingAccount({
        createdAt: yield* DateTime.now,
        freeTier: true,
        holder: workspaceId,
        id: yield* newId(BillingAccountIdSchema),
        partnerId: Option.none(),
        payer: Option.none(),
        standalone: false,
      });
    }).pipe(Effect.provide(context));

  // A person's workspace, under the person's hold: alone while a plan
  // subscription of its own entitles it; otherwise in the person's
  // account, made when missing with every workspace they are the oldest
  // owner of that has none yet, the oldest of them billing.
  const resolvePerson = (workspaceId: WorkspaceId, payer: UserId) =>
    transaction(
      Effect.gen(function* personResolved() {
        yield* store.holdPayer(payer);

        const now = yield* store.accountOf(workspaceId);

        if (Option.isSome(now)) {
          return now.value;
        }

        if (yield* entitledAlone(workspaceId)) {
          return yield* newAccount({
            holder: workspaceId,
            partnerId: Option.none(),
            payer: Option.some(payer),
            standalone: true,
          });
        }

        const personal = yield* store.personalOf(payer);

        if (Option.isSome(personal)) {
          yield* store.holdAccount(personal.value.id);
          yield* store.attach(
            workspaceId,
            personal.value.id,
            yield* DateTime.now
          );

          return personal.value;
        }

        const owned = (yield* payers.firstOwnedBy(payer)).map(
          (made) => made.workspaceId
        );

        const [held, partnered, subscribed] = yield* Effect.all([
          store.accountsIn(owned),
          payers.partnersIn(owned),
          subscriptions.ofWorkspaces(owned),
        ]);

        const joining = owned.filter(
          (id) =>
            id === workspaceId ||
            (!held.has(id) &&
              !partnered.has(id) &&
              !entitledBy(subscribed.get(id) ?? []))
        );

        const members = joining.includes(workspaceId)
          ? joining
          : [...joining, workspaceId];

        const [holder = workspaceId] = members;

        const account = yield* newAccount({
          holder,
          partnerId: Option.none(),
          payer: Option.some(payer),
          standalone: false,
        });

        const at = account.createdAt;

        yield* Effect.forEach(
          members.filter((id) => id !== holder),
          (id) => store.attach(id, account.id, at),
          { discard: true }
        );

        return account;
      })
    );

  const of = Effect.fn("BillingAccounts.of")(function* of(
    workspaceId: WorkspaceId
  ) {
    const [pool, current] = yield* Effect.all([
      payers.partnerOf(workspaceId),
      store.accountOf(workspaceId),
    ]);

    if (Option.isSome(pool)) {
      const { partnerId } = pool.value;

      if (
        Option.isSome(current) &&
        Option.contains(current.value.partnerId, partnerId)
      ) {
        return current.value;
      }

      return yield* resolvePartner(workspaceId, pool.value);
    }

    if (Option.isSome(current)) {
      // Still a partner's account, though no partner holds it now (its
      // partner account was closed): it goes to its owners.
      if (Option.isNone(current.value.partnerId)) {
        return current.value;
      }

      yield* transaction(leave(workspaceId, current.value));
    }

    const [payer] = yield* payers.ownersOf(workspaceId);

    return payer === undefined
      ? yield* alone(workspaceId)
      : yield* resolvePerson(workspaceId, payer);
  });

  // The workspace's account, held, then read again: a workspace moved to
  // another account in between is held in that one.
  const heldAccount = (
    workspaceId: WorkspaceId,
    attempt: number
  ): Effect.Effect<BillingAccount, DatabaseError> =>
    Effect.gen(function* held() {
      const account = yield* of(workspaceId);

      yield* store.holdAccount(account.id);

      const now = yield* store.accountOf(workspaceId);

      return Option.exists(now, ({ id }) => id === account.id) ||
        attempt >= poolAttempts
        ? account
        : yield* heldAccount(workspaceId, attempt + 1);
    });

  const poolOf = Effect.fn("BillingAccounts.poolOf")(function* poolOf(
    workspaceId: WorkspaceId
  ) {
    const account = yield* heldAccount(workspaceId, 1);

    const pool: AccountPool = {
      account,
      others: (yield* store.workspacesOf(account.id)).filter(
        (id) => id !== workspaceId
      ),
    };

    return pool;
  });

  const accountsIn = Effect.fn("BillingAccounts.accountsIn")(
    function* accountsIn(workspaceIds: readonly WorkspaceId[]) {
      const held = new Map(yield* store.accountsIn(workspaceIds));

      for (const workspaceId of workspaceIds) {
        if (!held.has(workspaceId)) {
          held.set(workspaceId, yield* of(workspaceId));
        }
      }

      return held;
    }
  );

  const poolsIn = Effect.fn("BillingAccounts.poolsIn")(function* poolsIn(
    workspaceIds: readonly WorkspaceId[]
  ) {
    if (workspaceIds.length === 0) {
      return new Map<WorkspaceId, AccountPool>();
    }

    const held = yield* accountsIn(workspaceIds);

    const members = yield* store.workspacesOfEach([
      ...new Set([...held.values()].map(({ id }) => id)),
    ]);

    return new Map<WorkspaceId, AccountPool>(
      [...held].map(([workspaceId, account]) => [
        workspaceId,
        {
          account,
          others: (members.get(account.id) ?? []).filter(
            (id) => id !== workspaceId
          ),
        },
      ])
    );
  });

  const subscriptionChanged = Effect.fn("BillingAccounts.subscriptionChanged")(
    function* subscriptionChanged(workspaceId: WorkspaceId) {
      const account = yield* of(workspaceId);
      const entitled = yield* entitledAlone(workspaceId);

      if (Option.isSome(account.partnerId) || Option.isNone(account.payer)) {
        return;
      }

      const payer = account.payer.value;

      // Its own plan ended: it joins its payer's account.
      if (account.standalone && !entitled) {
        yield* transaction(
          Effect.gen(function* joinPayer() {
            yield* store.holdPayer(payer);
            yield* leave(workspaceId, account);
          })
        );

        yield* of(workspaceId);

        return;
      }

      // A plan of its own, in an account another workspace bills: it
      // stands alone on it until it ends.
      if (!account.standalone && entitled && account.holder !== workspaceId) {
        yield* transaction(
          Effect.gen(function* standAlone() {
            yield* store.holdPayer(payer);
            yield* leave(workspaceId, account);
            yield* newAccount({
              holder: workspaceId,
              partnerId: Option.none(),
              payer: Option.some(payer),
              standalone: true,
            });
          })
        );
      }
    }
  );

  const moveTo = Effect.fn("BillingAccounts.moveTo")(function* moveTo(
    workspaceId: WorkspaceId,
    from: BillingAccount,
    payer: UserId
  ) {
    yield* store.holdPayer(payer);
    yield* leave(workspaceId, from);

    const personal = yield* store.personalOf(payer);

    if (Option.isNone(personal)) {
      return yield* newAccount({
        holder: workspaceId,
        partnerId: Option.none(),
        payer: Option.some(payer),
        standalone: false,
      });
    }

    yield* store.holdAccount(personal.value.id);
    yield* store.attach(workspaceId, personal.value.id, yield* DateTime.now);

    return personal.value;
  });

  const eraseWorkspace = Effect.fn("BillingAccounts.eraseWorkspace")(
    function* eraseWorkspace(workspaceId: WorkspaceId) {
      const current = yield* store.accountOf(workspaceId);

      yield* store.deleteTransfersOf(workspaceId);

      if (Option.isSome(current)) {
        yield* leave(workspaceId, current.value);
      }
    }
  );

  const forgetPayer = Effect.fn("BillingAccounts.forgetPayer")(
    function* forgetPayer(userId: UserId) {
      yield* store.holdPayer(userId);
      yield* store.deleteTransfersFor(userId);

      const paid = yield* store.paidBy(userId);

      yield* Effect.forEach(
        paid,
        Effect.fnUntraced(function* release(account) {
          yield* store.holdAccount(account.id);
          yield* store.delete(account.id);
        }),
        { discard: true }
      );
    }
  );

  return {
    accountsIn,
    eraseWorkspace,
    forgetPayer,
    leave,
    moveTo,
    of,
    poolOf,
    poolsIn,
    subscriptionChanged,
  };
});

/**
 * Who pays for each workspace: the billing account it belongs to, a
 * person's (the one who made it) or a partner's (its home workspace and
 * those it owns), which share one plan and count their channels together.
 * A workspace read for the first time is given its account then, under a
 * hold on its payer: its oldest owner, whose account is made if missing,
 * with every workspace they are the oldest owner of that has none, the
 * oldest billing; a workspace a plan subscription of its own still
 * entitles stands alone until it ends. Rows are written on a server that
 * does not bill too, and nothing refuses by them there.
 */
export class BillingAccounts extends Context.Service<
  BillingAccounts,
  {
    /** The workspace's account, written the first time it is read. */
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<BillingAccount, DatabaseError>;
    /** The account of each of these workspaces, as `of` answers it. */
    readonly accountsIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, BillingAccount>, DatabaseError>;
    /**
     * The workspace's account and its other workspaces. In a transaction,
     * the account stays held until it ends, so what is counted across it
     * and then added takes turns, and no workspace joins or leaves it
     * meanwhile.
     */
    readonly poolOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<AccountPool, DatabaseError>;
    /**
     * The pool of each of these workspaces, as `poolOf` answers it,
     * holding none: for reports of a state, never to count and then add.
     */
    readonly poolsIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, AccountPool>, DatabaseError>;
    /** Takes the workspace out of its account, in the caller's transaction. */
    readonly leave: (
      workspaceId: WorkspaceId,
      account: BillingAccount
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Moves the workspace from its account to the person's own, made with
     * it as billing workspace if they have none, in the caller's
     * transaction, under the person's hold and both accounts'.
     */
    readonly moveTo: (
      workspaceId: WorkspaceId,
      from: BillingAccount,
      payer: UserId
    ) => Effect.Effect<BillingAccount, DatabaseError>;
    /**
     * Follows a subscription the workspace's own: one that entitles keeps
     * it alone, and once it ends the workspace joins its payer's account.
     */
    readonly subscriptionChanged: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** Forgets the workspace, in the erasure's transaction. */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Forgets the accounts a person pays for, in the closure's
     * transaction: their workspaces that remain go to their oldest owner
     * left the next time they are read.
     */
    readonly forgetPayer: (
      userId: UserId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/BillingAccounts") {
  static readonly layer = Layer.effect(BillingAccounts, make);
}
