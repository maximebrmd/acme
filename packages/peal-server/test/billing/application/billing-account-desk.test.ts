// What staff do about one free tier per person, on Postgres: the platform
// accounts connected under several free billing accounts, merging one
// account into another, requiring a payment method; each audited first.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { BillingAccountDesk } from "#billing/application/billing-account-desk.ts";
import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { AccountChannels } from "#billing/application/ports/account-channels.ts";
import type { PlatformAccountHeld } from "#billing/application/ports/account-channels.ts";
import { AccountsNotMerged } from "#billing/domain/accounts-not-merged.ts";
import { AuditedAccountDeskLive } from "#billing/infrastructure/audited-account-desk.ts";
import { DrizzleBillingAccountStoreLive } from "#billing/infrastructure/drizzle-billing-account-store.ts";
import { DrizzleSubscriptionsLive } from "#billing/infrastructure/drizzle-subscriptions.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { BillingAccountAuditLive } from "#staff/container.ts";
import {
  accountsTest,
  cleanUpAccounts,
  person,
  subscribe,
  workspaceOwnedBy,
} from "#test/billing/support.ts";

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

const DeskTest = BillingAccountDesk.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleBillingAccountStoreLive,
      DrizzleSubscriptionsLive,
      ChannelsSharedTest,
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
});
