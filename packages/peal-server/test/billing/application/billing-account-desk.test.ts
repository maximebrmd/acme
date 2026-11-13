// What staff do about one free tier per person, on Postgres: the platform
// accounts connected under several free billing accounts, merging one
// account into another, requiring a payment method; each audited first.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { BillingAccountDesk } from "#billing/application/billing-account-desk.ts";
import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { AccountChannels } from "#billing/application/ports/account-channels.ts";
import type { PlatformAccountHeld } from "#billing/application/ports/account-channels.ts";
import { StartAccountDays } from "#billing/application/start-account-days.ts";
import { AccountsNotMerged } from "#billing/domain/accounts-not-merged.ts";
import { AuditedAccountDeskLive } from "#billing/infrastructure/audited-account-desk.ts";
import { DrizzleBillingAccountStoreLive } from "#billing/infrastructure/drizzle-billing-account-store.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import { WorkspaceAccountPayersLive } from "#billing/infrastructure/workspace-account-payers.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { BillingAccountAuditLive } from "#staff/container.ts";
import {
  accountsTest,
  cleanUpAccounts,
  person,
  personWith,
  PlainPseudonymsTest,
  subscribe,
  workspaceOwnedBy,
} from "#test/billing/support.ts";
import {
  PartnerOwnershipLive,
  WorkspaceOwnersLive,
} from "#workspace/container.ts";

// The platform accounts the channels context answers, as the tests set them.
let shared: readonly PlatformAccountHeld[] = [];

const ChannelsSharedTest = Layer.succeed(
  AccountChannels,
  AccountChannels.of({
    ownIn: () => Effect.succeed(new Map()),
    sharedPage: (after, limit) =>
      Effect.succeed(
        shared
          .filter((held) =>
            Option.match(after, {
              onNone: () => true,
              onSome: ({ accountId }) => held.accountId > accountId,
            })
          )
          .slice(0, limit)
      ),
  })
);

// The accounts whose day was raised after a move.
const raisedAccounts: string[] = [];

const DaysRaisedTest = Layer.mock(StartAccountDays, {
  raiseAccount: (accountId) =>
    Effect.sync(() => {
      raisedAccounts.push(accountId);
    }),
});

const DeskTest = BillingAccountDesk.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DaysRaisedTest,
      DrizzleBillingAccountStoreLive,
      DrizzleSubscriptionsLive,
      ChannelsSharedTest,
      PlainPseudonymsTest,
      WorkspaceAccountPayersLive.pipe(
        Layer.provide(Layer.merge(PartnerOwnershipLive, WorkspaceOwnersLive))
      ),
      AuditedAccountDeskLive.pipe(Layer.provide(BillingAccountAuditLive))
    )
  ),
  Layer.provideMerge(accountsTest)
);

const auditedFor = (accountId: string) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly action: string;
        readonly reason: string;
      }>`SELECT action, reason FROM staff.audit_events WHERE object_ids->>'accountId' = ${accountId} ORDER BY at, id`
  ).pipe(Effect.orDie);

const cleanUp = (workspaceIds: readonly WorkspaceId[]) =>
  cleanUpAccounts(workspaceIds).pipe(
    Effect.andThen(
      Effect.sync(() => {
        shared = [];
      })
    )
  );

layer(DeskTest)("the billing accounts desk", (it) => {
  it.effect(
    "lists a platform account under two free accounts, and none under a paying one",
    () =>
      Effect.gen(function* listed() {
        const desk = yield* BillingAccountDesk;
        const accounts = yield* BillingAccounts;
        const first = yield* person;
        const second = yield* person;
        const third = yield* person;
        const a = yield* workspaceOwnedBy([first]);
        const b = yield* workspaceOwnedBy([second]);
        const paying = yield* workspaceOwnedBy([third]);

        yield* subscribe(paying, "active");

        shared = [
          {
            accountId: "synthetic-1",
            platform: "mastodon",
            workspaceIds: [a, b],
          },
          {
            accountId: "synthetic-2",
            platform: "mastodon",
            workspaceIds: [a, paying],
          },
        ];

        const page = yield* desk.sharedChannels(Option.none(), 50);
        const [ofA, ofB] = yield* Effect.all([accounts.of(a), accounts.of(b)]);

        assert.deepStrictEqual(page.items, [
          {
            accountId: "synthetic-1",
            accounts: [
              { accountId: ofA.id, workspaces: 1 },
              { accountId: ofB.id, workspaces: 1 },
            ].toSorted((x, y) => x.accountId.localeCompare(y.accountId)),
            platform: "mastodon",
          },
        ]);
        assert.isTrue(Option.isNone(page.next));

        const first1 = yield* desk.sharedChannels(Option.none(), 1);

        assert.deepStrictEqual(
          first1.next,
          Option.some({ accountId: "synthetic-1", platform: "mastodon" })
        );

        yield* cleanUp([a, b, paying]);
      })
  );

  it.effect(
    "merges one account into another, audited, and refuses a paying one",
    () =>
      Effect.gen(function* merged() {
        const desk = yield* BillingAccountDesk;
        const accounts = yield* BillingAccounts;
        const staff = yield* person;
        const first = yield* person;
        const second = yield* person;
        const kept = yield* workspaceOwnedBy([first]);
        const moved = yield* workspaceOwnedBy([second]);
        const paying = yield* workspaceOwnedBy([second]);

        yield* subscribe(paying, "active");

        const [into, from, standalone] = yield* Effect.all([
          accounts.of(kept),
          accounts.of(moved),
          accounts.of(paying),
        ]);

        assert.deepStrictEqual(
          yield* desk
            .merge({
              from: standalone.id,
              into: into.id,
              reason: "Synthetic reason",
              staffId: staff,
            })
            .pipe(Effect.flip),
          new AccountsNotMerged({ reason: "subscribed" })
        );

        assert.deepStrictEqual(
          yield* desk
            .merge({
              from: into.id,
              into: into.id,
              reason: "Synthetic reason",
              staffId: staff,
            })
            .pipe(Effect.flip),
          new AccountsNotMerged({ reason: "same" })
        );

        const done = yield* desk.merge({
          from: from.id,
          into: into.id,
          reason: "Synthetic reason",
          staffId: staff,
        });

        assert.strictEqual(done.account.id, into.id);
        // The account merged into holds the moved accounts from today.
        assert.include(raisedAccounts, into.id);
        assert.deepStrictEqual(
          [...done.workspaceIds].toSorted(),
          [kept, moved].toSorted()
        );
        assert.strictEqual((yield* accounts.of(moved)).id, into.id);
        assert.deepStrictEqual(yield* auditedFor(from.id), [
          { action: "mergeBillingAccounts", reason: "Synthetic reason" },
        ]);

        yield* cleanUp([kept, moved, paying]);
      })
  );

  it.effect("requires a payment method, and gives the free tier back", () =>
    Effect.gen(function* required() {
      const desk = yield* BillingAccountDesk;
      const accounts = yield* BillingAccounts;
      const staff = yield* person;
      const payer = yield* person;
      const workspace = yield* workspaceOwnedBy([payer]);
      const account = yield* accounts.of(workspace);

      const taken = yield* desk.requirePaymentMethod({
        accountId: account.id,
        reason: "Synthetic reason",
        required: true,
        staffId: staff,
      });

      assert.isFalse(taken.account.freeTier);
      assert.isFalse((yield* accounts.of(workspace)).freeTier);

      const back = yield* desk.requirePaymentMethod({
        accountId: account.id,
        reason: "Synthetic undo",
        required: false,
        staffId: staff,
      });

      assert.isTrue(back.account.freeTier);
      assert.deepStrictEqual(yield* auditedFor(account.id), [
        { action: "requirePaymentMethod", reason: "Synthetic reason" },
        { action: "restoreFreeTier", reason: "Synthetic undo" },
      ]);

      const byWorkspace = yield* desk.account({ workspaceId: workspace });

      assert.strictEqual(byWorkspace.account.id, account.id);

      yield* cleanUp([workspace]);
    })
  );

  it.effect(
    "keep a payment method required of a person whatever becomes of their accounts",
    () =>
      Effect.gen(function* survives() {
        const desk = yield* BillingAccountDesk;
        const accounts = yield* BillingAccounts;
        const sql = yield* SqlClient.SqlClient;
        const staff = yield* person;
        const email = `${randomUUID()}@example.com`;
        const payer = yield* personWith(email);
        const first = yield* workspaceOwnedBy([payer]);

        yield* desk.requirePaymentMethod({
          accountId: (yield* accounts.of(first)).id,
          reason: "Synthetic reason",
          required: true,
          staffId: staff,
        });

        // Its only workspace erased, a new one made.
        yield* accounts.eraseWorkspace(first);

        const second = yield* workspaceOwnedBy([payer]);

        assert.isFalse((yield* accounts.of(second)).freeTier);

        // The account closed, and the address signing up again.
        yield* accounts.forgetPayer(payer, `pseudonym:${email}`);
        yield* sql`DELETE FROM auth.member WHERE user_id = ${payer}`.pipe(
          Effect.orDie
        );
        yield* sql`DELETE FROM auth.user WHERE id = ${payer}`.pipe(
          Effect.orDie
        );

        const again = yield* personWith(email);
        const third = yield* workspaceOwnedBy([again]);

        assert.isFalse((yield* accounts.of(third)).freeTier);

        // Given back: the next account is free again.
        const back = yield* desk.requirePaymentMethod({
          accountId: (yield* accounts.of(third)).id,
          reason: "Synthetic undo",
          required: false,
          staffId: staff,
        });

        assert.isTrue(back.account.freeTier);
        yield* accounts.eraseWorkspace(third);

        const fourth = yield* workspaceOwnedBy([again]);

        assert.isTrue((yield* accounts.of(fourth)).freeTier);

        yield* cleanUp([first, second, third, fourth]);
      })
  );

  it.effect("carry a required payment method through a merge", () =>
    Effect.gen(function* merged() {
      const desk = yield* BillingAccountDesk;
      const accounts = yield* BillingAccounts;
      const staff = yield* person;
      const kept = yield* person;
      const required = yield* person;
      const into = yield* workspaceOwnedBy([kept]);
      const from = yield* workspaceOwnedBy([required]);

      const [target, source] = yield* Effect.all([
        accounts.of(into),
        accounts.of(from),
      ]);

      yield* desk.requirePaymentMethod({
        accountId: source.id,
        reason: "Synthetic reason",
        required: true,
        staffId: staff,
      });

      const done = yield* desk.merge({
        from: source.id,
        into: target.id,
        reason: "Synthetic reason",
        staffId: staff,
      });

      assert.isFalse(done.account.freeTier);

      // The merged person's next workspace has no free tier either.
      const later = yield* workspaceOwnedBy([required]);

      assert.isFalse((yield* accounts.of(later)).freeTier);

      // Nor does the person it was merged into, whatever becomes of the
      // account: its workspaces erased, a new one made.
      yield* Effect.forEach([into, from], (id) => accounts.eraseWorkspace(id), {
        discard: true,
      });

      const fresh = yield* workspaceOwnedBy([kept]);

      assert.isFalse((yield* accounts.of(fresh)).freeTier);

      yield* cleanUp([into, from, later, fresh]);
    })
  );

  it.effect(
    "keep merged workspaces whoever owns them, until staff detach them back",
    () =>
      Effect.gen(function* undone() {
        const desk = yield* BillingAccountDesk;
        const accounts = yield* BillingAccounts;
        const sql = yield* SqlClient.SqlClient;
        const staff = yield* person;
        const kept = yield* person;
        const merged = yield* person;
        const into = yield* workspaceOwnedBy([kept]);
        const from = yield* workspaceOwnedBy([merged]);

        const [target, source] = yield* Effect.all([
          accounts.of(into),
          accounts.of(from),
        ]);

        yield* desk.merge({
          from: source.id,
          into: target.id,
          reason: "Synthetic reason",
          staffId: staff,
        });

        // Staff see what the merge moved, in the account and the audit log.
        assert.deepStrictEqual(
          (yield* desk.account({ accountId: target.id })).merged,
          [from]
        );

        const [mergeEvent] = yield* sql<{
          readonly objectIds: Readonly<Record<string, string>>;
        }>`SELECT object_ids AS "objectIds" FROM staff.audit_events WHERE object_ids->>'accountId' = ${source.id} AND action = 'mergeBillingAccounts'`.pipe(
          Effect.orDie
        );

        assert.deepStrictEqual(mergeEvent?.objectIds, {
          accountId: source.id,
          intoAccountId: target.id,
          workspace1: from,
        });

        // Its payer owns none of it, yet it stays: staff put it there.
        assert.strictEqual((yield* accounts.of(from)).id, target.id);
        assert.strictEqual(
          (yield* accounts.accountsIn([from])).get(from)?.id,
          target.id
        );

        const back = yield* desk.detach({
          reason: "Synthetic undo",
          staffId: staff,
          workspaceId: from,
        });

        assert.deepStrictEqual(back.account.payer, Option.some(merged));
        assert.deepStrictEqual(back.workspaceIds, [from]);
        assert.include(raisedAccounts, back.account.id);
        assert.deepStrictEqual((yield* accounts.poolOf(into)).others, []);

        const [event] = yield* sql<{
          readonly action: string;
          readonly workspaceId: string;
        }>`SELECT action, workspace_id AS "workspaceId" FROM staff.audit_events WHERE object_ids->>'accountId' = ${target.id} AND action = 'detachBillingWorkspace'`.pipe(
          Effect.orDie
        );

        assert.deepStrictEqual(event, {
          action: "detachBillingWorkspace",
          workspaceId: from,
        });

        yield* cleanUp([into, from]);
      })
  );

  it.effect(
    "give a detached workspace back to who paid for it before the merge, while they own it",
    () =>
      Effect.gen(function* backToPayer() {
        const desk = yield* BillingAccountDesk;
        const accounts = yield* BillingAccounts;
        const { transaction } = yield* TransactionRunner;
        const staff = yield* person;
        const handing = yield* person;
        const merged = yield* person;
        const kept = yield* person;
        const into = yield* workspaceOwnedBy([kept]);
        const handed = yield* workspaceOwnedBy([handing, merged]);
        const own = yield* workspaceOwnedBy([merged]);

        // Handed to the merged person by transfer, as accepting does.
        const before = yield* accounts.of(handed);

        yield* transaction(accounts.moveTo(handed, before, merged));

        const source = yield* accounts.of(own);

        assert.strictEqual((yield* accounts.of(handed)).id, source.id);

        yield* desk.merge({
          from: source.id,
          into: (yield* accounts.of(into)).id,
          reason: "Synthetic reason",
          staffId: staff,
        });

        const back = yield* desk.detach({
          reason: "Synthetic undo",
          staffId: staff,
          workspaceId: handed,
        });

        assert.deepStrictEqual(back.account.payer, Option.some(merged));

        yield* cleanUp([into, handed, own]);
      })
  );

  it.effect("never bill an account on a workspace staff merged into it", () =>
    Effect.gen(function* neverHolder() {
      const desk = yield* BillingAccountDesk;
      const accounts = yield* BillingAccounts;
      const staff = yield* person;
      const kept = yield* person;
      const merged = yield* person;
      const into = yield* workspaceOwnedBy([kept]);
      const from = yield* workspaceOwnedBy([merged]);
      const target = yield* accounts.of(into);

      yield* desk.merge({
        from: (yield* accounts.of(from)).id,
        into: target.id,
        reason: "Synthetic reason",
        staffId: staff,
      });

      // The account's own workspace goes: what is left was merged, and
      // goes back to its owner rather than bill the account.
      yield* accounts.eraseWorkspace(into);
      yield* SqlClient.SqlClient.use(
        (sql) => sql`DELETE FROM auth.organization WHERE id = ${into}`
      ).pipe(Effect.orDie);

      const after = yield* accounts.of(from);

      assert.notStrictEqual(after.id, target.id);
      assert.deepStrictEqual(after.payer, Option.some(merged));
      assert.strictEqual(after.holder, from);

      // The payer's next workspace bills itself.
      const next = yield* workspaceOwnedBy([kept]);

      assert.strictEqual((yield* accounts.of(next)).holder, next);

      yield* cleanUp([into, from, next]);
    })
  );
});
