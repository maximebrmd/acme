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
import { Pseudonyms } from "#shared/application/pseudonyms.ts";
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
  const pseudonyms = yield* Pseudonyms;
  const context = yield* Effect.context<Ids>();

  // Whether staff required a payment method of the person: by their id,
  // or by their address's pseudonym from an account they closed before.
  const paymentRequired = (payer: UserId) =>
    Effect.gen(function* requiredOfPayer() {
      const email = yield* payers.emailOf(payer);

      const pseudonym = Option.isSome(email)
        ? Option.some(yield* pseudonyms.ofEmail(email.value))
        : Option.none<string>();

      return yield* store.requiresPayment(payer, pseudonym);
    });

  const newAccount = (fields: {
    readonly holder: WorkspaceId;
    readonly partnerId: Option.Option<Uuid7>;
    readonly payer: Option.Option<UserId>;
    readonly standalone: boolean;
  }) =>
    Effect.gen(function* made() {
      // A payment method staff required of the payer outlives every
      // account they had.
      const required = Option.isSome(fields.payer)
        ? yield* paymentRequired(fields.payer.value)
        : false;

      const account = new BillingAccount({
        createdAt: yield* DateTime.now,
        freeTier: !required,
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
    const merged = yield* store.mergedIn(remaining);

    // The oldest workspace left that still exists bills, never one staff
    // merged in; an account left with none goes, and what staff merged
    // into it goes back to its owners, read next.
    const [oldest] = yield* payers.madeIn(
      remaining.filter((id) => !merged.has(id))
    );

    if (oldest === undefined) {
      yield* store.delete(account.id);

      return;
    }

    yield* store.setHolder(account.id, oldest.workspaceId);
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
          return Option.some(now.value);
        }

        // Read again under the hold: the person may have left, or closed
        // their account, since the owners were read.
        const [oldest] = yield* payers.ownersOf(workspaceId);

        if (oldest !== payer) {
          return Option.none<BillingAccount>();
        }

        if (yield* entitledAlone(workspaceId)) {
          return Option.some(
            yield* newAccount({
              holder: workspaceId,
              partnerId: Option.none(),
              payer: Option.some(payer),
              standalone: true,
            })
          );
        }

        const personal = yield* store.personalOf(payer);

        if (Option.isSome(personal)) {
          yield* store.holdAccount(personal.value.id);
          yield* store.attach(
            workspaceId,
            personal.value.id,
            yield* DateTime.now
          );

          return Option.some(personal.value);
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

        return Option.some(account);
      })
    );

  const ofAttempt = (
    workspaceId: WorkspaceId,
    attempt: number
  ): Effect.Effect<BillingAccount, DatabaseError> =>
    Effect.gen(function* ofAttempted() {
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

      const owners = yield* payers.ownersOf(workspaceId);

      if (Option.isSome(current)) {
        const account = current.value;

        // A person's account whose payer still owns the workspace, or one
        // staff merged it into, holds it.
        if (
          Option.isNone(account.partnerId) &&
          (Option.isNone(account.payer) ||
            owners.includes(account.payer.value) ||
            (yield* store.mergedIn([workspaceId])).has(workspaceId))
        ) {
          return account;
        }

        // A partner's account no partner holds now (its partner account was
        // closed), or a payer who left the workspace, was removed or stopped
        // being an owner: it goes to its oldest owner.
        yield* transaction(
          Effect.gen(function* leaving() {
            yield* Option.match(account.payer, {
              onNone: () => Effect.void,
              onSome: (payer) => store.holdPayer(payer),
            });
            yield* leave(workspaceId, account);
          })
        );
      }

      const [payer] = owners;

      if (payer === undefined) {
        return yield* alone(workspaceId);
      }

      const resolved = yield* resolvePerson(workspaceId, payer);

      // Its owners changed meanwhile: read them again.
      return yield* Option.match(resolved, {
        onNone: () =>
          attempt >= poolAttempts
            ? alone(workspaceId)
            : ofAttempt(workspaceId, attempt + 1),
        onSome: Effect.succeed,
      });
    });

  const of = Effect.fn("BillingAccounts.of")(function* of(
    workspaceId: WorkspaceId
  ) {
    return yield* ofAttempt(workspaceId, 1);
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

      const [owners, merged, partnered] = yield* Effect.all([
        payers.ownersIn(workspaceIds),
        store.mergedIn(workspaceIds),
        payers.partnersIn(workspaceIds),
      ]);

      // Those with no account yet, and those whose payer no longer owns
      // them (and no staff merge holds), are resolved as `of` resolves one.
      const stale = (workspaceId: WorkspaceId) => {
        const account = held.get(workspaceId);

        const partner = partnered.get(workspaceId);

        return (
          account === undefined ||
          (partner === undefined
            ? Option.isSome(account.partnerId)
            : !Option.contains(account.partnerId, partner.partnerId)) ||
          (Option.isSome(account.payer) &&
            !merged.has(workspaceId) &&
            !(owners.get(workspaceId) ?? []).includes(account.payer.value))
        );
      };

      for (const workspaceId of workspaceIds.filter(stale)) {
        held.set(workspaceId, yield* of(workspaceId));
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
    function* forgetPayer(userId: UserId, pseudonym: string) {
      yield* store.holdPayer(userId);
      yield* store.deleteTransfersFor(userId);

      // A payment method staff required stays with the address, for when
      // it signs up again.
      yield* store.rememberPayment(userId, pseudonym, yield* DateTime.now);

      const paid = yield* store.paidBy(userId);

      // Held in the order of their ids, as every other path holds them.
      yield* Effect.forEach(
        paid.toSorted((a, b) => a.id.localeCompare(b.id)),
        Effect.fnUntraced(function* release(account) {
          yield* store.holdAccount(account.id);
          yield* store.delete(account.id);
        }),
        { discard: true }
      );
    }
  );

  // The daily sweep, for these workspaces: each one's account, one at a
  // time, a failure logged and left to the next read or run.
  const sweepIn = Effect.fn("BillingAccounts.sweepIn")(function* sweepIn(
    workspaceIds: readonly WorkspaceId[]
  ) {
    const held = yield* store.accountsIn(workspaceIds);

    const [owners, merged, partnered] = yield* Effect.all([
      payers.ownersIn(workspaceIds),
      store.mergedIn(workspaceIds),
      payers.partnersIn(workspaceIds),
    ]);

    let failed = 0;

    for (const workspaceId of workspaceIds) {
      const account = held.get(workspaceId);
      const partner = partnered.get(workspaceId);

      const right =
        account !== undefined &&
        (partner === undefined
          ? Option.isNone(account.partnerId)
          : Option.contains(account.partnerId, partner.partnerId)) &&
        (Option.isNone(account.payer) ||
          merged.has(workspaceId) ||
          (owners.get(workspaceId) ?? []).includes(account.payer.value));

      if (!right) {
        const ended = yield* of(workspaceId).pipe(Effect.exit);

        if (ended._tag === "Failure") {
          failed += 1;
          yield* Effect.logWarning(
            "Giving a workspace its billing account failed",
            ended.cause
          ).pipe(Effect.annotateLogs({ workspaceId }));
        }
      }
    }

    return failed;
  });

  // Accounts whose billing workspace is gone (erased by a release that did
  // not know of them): the oldest workspace left bills, or the account
  // goes. Then the offers that lapsed. A page at a time.
  const repair = Effect.fn("BillingAccounts.repair")(function* repair(
    pageSize: number
  ) {
    let after = Option.none<BillingAccount["id"]>();
    let repaired = 0;
    let more = true;

    while (more) {
      const page = yield* store.page(after, pageSize);

      const made = new Set(
        (yield* payers.madeIn(page.map(({ holder }) => holder))).map(
          ({ workspaceId }) => workspaceId
        )
      );

      for (const account of page.filter(({ holder }) => !made.has(holder))) {
        yield* transaction(leave(account.holder, account));
        repaired += 1;
      }

      more = page.length === pageSize;
      after = Option.fromUndefinedOr(page.at(-1)?.id);
    }

    const lapsed = yield* store.purgeLapsedTransfers(yield* DateTime.now);

    return { lapsed, repaired };
  });

  return {
    accountsIn,
    eraseWorkspace,
    forgetPayer,
    leave,
    moveTo,
    of,
    poolOf,
    poolsIn,
    repair,
    subscriptionChanged,
    sweepIn,
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
    /**
     * The daily sweep's part for these workspaces: each is given its
     * account, or the one it should be on now, one at a time, a failure
     * logged rather than stopping the others. Says how many failed.
     */
    readonly sweepIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Repairs the accounts whose billing workspace is gone, `pageSize` at
     * a time, and deletes the offers that lapsed.
     */
    readonly repair: (
      pageSize: number
    ) => Effect.Effect<
      { readonly lapsed: number; readonly repaired: number },
      DatabaseError
    >;
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
      userId: UserId,
      pseudonym: string
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/BillingAccounts") {
  static readonly layer = Layer.effect(BillingAccounts, make);
}
