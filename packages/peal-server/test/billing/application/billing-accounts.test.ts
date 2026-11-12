// Who pays for each workspace, on Postgres: the person who made it, or
// for a workspace made before billing accounts its oldest owner, one
// account per person whatever the reads sent together; a partner's pool
// on the partner's account; a workspace a plan of its own entitles alone
// until it ends.
import { assert, layer } from "@effect/vitest";
import { Effect, Option } from "effect";
import { SqlClient } from "effect/sql";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import {
  accountsTest,
  cleanUpAccounts,
  partnerOf,
  person,
  subscribe,
  workspaceOwnedBy,
} from "#test/billing/support.ts";

// The rows the billing accounts hold for these workspaces.
const attachmentsOf = (workspaceIds: readonly string[]) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly accountId: string;
        readonly workspaceId: string;
      }>`SELECT account_id AS "accountId", workspace_id AS "workspaceId" FROM billing.account_workspaces WHERE workspace_id = ANY(string_to_array(${workspaceIds.join(",")}, ',')::uuid[]) ORDER BY workspace_id`
  ).pipe(Effect.orDie);

const accountsPaidBy = (userId: string) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly id: string;
      }>`SELECT id FROM billing.accounts WHERE payer_user_id = ${userId}`
  ).pipe(Effect.orDie);

layer(accountsTest)("billing accounts", (it) => {
  it.effect(
    "are made with a person's first workspace, which the next joins",
    () =>
      Effect.gen(function* firstAndSecond() {
        const accounts = yield* BillingAccounts;
        const payer = yield* person;
        const first = yield* workspaceOwnedBy([payer]);

        const made = yield* accounts.of(first);

        assert.strictEqual(made.holder, first);
        assert.deepStrictEqual(made.payer, Option.some(payer));
        assert.isFalse(made.standalone);

        const second = yield* workspaceOwnedBy([payer]);
        const joined = yield* accounts.of(second);

        assert.strictEqual(joined.id, made.id);
        assert.strictEqual(joined.holder, first);

        const pool = yield* accounts.poolOf(second);

        assert.deepStrictEqual(pool.others, [first]);

        yield* cleanUpAccounts([first, second]);
      })
  );

  it.effect("end in one account for two workspaces read together", () =>
    Effect.gen(function* together() {
      const accounts = yield* BillingAccounts;
      const payer = yield* person;
      const first = yield* workspaceOwnedBy([payer]);
      const second = yield* workspaceOwnedBy([payer]);

      const [a, b] = yield* Effect.all(
        [accounts.of(first), accounts.of(second)],
        { concurrency: 2 }
      );

      assert.strictEqual(a.id, b.id);
      assert.lengthOf(yield* accountsPaidBy(payer), 1);
      // The oldest of them bills.
      assert.strictEqual(a.holder, first);

      yield* cleanUpAccounts([first, second]);
    })
  );

  it.effect(
    "give an existing workspace to its oldest owner once, whatever the reads sent together",
    () =>
      Effect.gen(function* existing() {
        const accounts = yield* BillingAccounts;
        const oldest = yield* person;
        const later = yield* person;
        const workspace = yield* workspaceOwnedBy([oldest, later]);

        const read = yield* Effect.all(
          Array.from({ length: 6 }, () => accounts.of(workspace)),
          { concurrency: "unbounded" }
        );

        assert.lengthOf(new Set(read.map(({ id }) => id)), 1);
        assert.deepStrictEqual(read[0]?.payer, Option.some(oldest));
        assert.lengthOf(yield* accountsPaidBy(oldest), 1);
        assert.lengthOf(yield* accountsPaidBy(later), 0);
        assert.lengthOf(yield* attachmentsOf([workspace]), 1);

        yield* cleanUpAccounts([workspace]);
      })
  );

  it.effect(
    "bill a person's workspaces on the oldest, whichever is read first",
    () =>
      Effect.gen(function* oldestBills() {
        const accounts = yield* BillingAccounts;
        const payer = yield* person;
        const older = yield* workspaceOwnedBy([payer]);
        const newer = yield* workspaceOwnedBy([payer]);

        const account = yield* accounts.of(newer);

        assert.strictEqual(account.holder, older);

        // Both joined it at once.
        const rows = yield* attachmentsOf([older, newer]);

        assert.deepStrictEqual(
          rows.map(({ accountId }) => accountId),
          [account.id, account.id]
        );

        yield* cleanUpAccounts([older, newer]);
      })
  );

  it.effect(
    "put a partner's home and customers on the partner's account, not its owner's",
    () =>
      Effect.gen(function* partners() {
        const accounts = yield* BillingAccounts;
        const owner = yield* person;
        const home = yield* workspaceOwnedBy([owner]);
        const personal = yield* workspaceOwnedBy([owner]);

        // Before the partner account: the owner's, billed on the home.
        const before = yield* accounts.of(personal);

        assert.strictEqual(before.holder, home);

        const customer = yield* workspaceOwnedBy([]);
        const partnerId = yield* partnerOf(home, [customer]);

        const ofCustomer = yield* accounts.of(customer);
        const ofHome = yield* accounts.of(home);

        assert.strictEqual(ofCustomer.id, ofHome.id);
        assert.deepStrictEqual(ofHome.partnerId, Option.some(partnerId));
        assert.strictEqual(ofHome.holder, home);
        assert.isTrue(Option.isNone(ofHome.payer));

        // The owner's account is billed on the workspace left.
        const after = yield* accounts.of(personal);

        assert.strictEqual(after.id, before.id);
        assert.strictEqual(after.holder, personal);

        yield* cleanUpAccounts([home, personal, customer]);
      })
  );

  it.effect(
    "keep a workspace a plan of its own entitles alone, until the plan ends",
    () =>
      Effect.gen(function* standalone() {
        const accounts = yield* BillingAccounts;
        const payer = yield* person;
        const free = yield* workspaceOwnedBy([payer]);
        const paid = yield* workspaceOwnedBy([payer]);

        const subscription = yield* subscribe(paid, "active");

        const alone = yield* accounts.of(paid);
        const personal = yield* accounts.of(free);

        assert.isTrue(alone.standalone);
        assert.strictEqual(alone.holder, paid);
        assert.notStrictEqual(alone.id, personal.id);
        assert.deepStrictEqual((yield* accounts.poolOf(paid)).others, []);

        yield* SqlClient.SqlClient.use(
          (sql) =>
            sql`UPDATE billing.subscriptions SET status = 'canceled' WHERE stripe_subscription_id = ${subscription}`
        ).pipe(Effect.orDie);

        yield* accounts.subscriptionChanged(paid);

        const joined = yield* accounts.of(paid);

        assert.strictEqual(joined.id, personal.id);
        assert.strictEqual(joined.holder, free);
        assert.lengthOf(yield* accountsPaidBy(payer), 1);

        yield* cleanUpAccounts([free, paid]);
      })
  );
  it.effect(
    "hand a closed account's workspaces to their oldest other owner",
    () =>
      Effect.gen(function* closed() {
        const accounts = yield* BillingAccounts;
        const leaving = yield* person;
        const staying = yield* person;
        const own = yield* workspaceOwnedBy([staying]);
        const shared = yield* workspaceOwnedBy([leaving, staying]);

        assert.deepStrictEqual(
          (yield* accounts.of(shared)).payer,
          Option.some(leaving)
        );

        // Closing the account: its accounts are forgotten, its memberships
        // deleted, in one transaction.
        yield* accounts.forgetPayer(leaving);
        yield* SqlClient.SqlClient.use(
          (sql) => sql`DELETE FROM auth.member WHERE user_id = ${leaving}`
        ).pipe(Effect.orDie);

        const after = yield* accounts.of(shared);

        assert.deepStrictEqual(after.payer, Option.some(staying));
        assert.strictEqual(after.id, (yield* accounts.of(own)).id);
        assert.lengthOf(yield* accountsPaidBy(leaving), 0);

        yield* cleanUpAccounts([own, shared]);
      })
  );

  it.effect(
    "bill on the oldest workspace left once the billing workspace is erased",
    () =>
      Effect.gen(function* erased() {
        const accounts = yield* BillingAccounts;
        const payer = yield* person;
        const first = yield* workspaceOwnedBy([payer]);
        const second = yield* workspaceOwnedBy([payer]);
        const third = yield* workspaceOwnedBy([payer]);
        const account = yield* accounts.of(third);

        assert.strictEqual(account.holder, first);

        yield* accounts.eraseWorkspace(first);

        const after = yield* accounts.of(third);

        assert.strictEqual(after.id, account.id);
        assert.strictEqual(after.holder, second);
        assert.deepStrictEqual((yield* accounts.poolOf(second)).others, [
          third,
        ]);

        // The last one erased takes the account with it.
        yield* accounts.eraseWorkspace(second);
        yield* accounts.eraseWorkspace(third);

        assert.lengthOf(yield* accountsPaidBy(payer), 0);

        yield* cleanUpAccounts([first, second, third]);
      })
  );
});
