// Starting the day of every billing account: a batch that fails leaves the
// others started, says so, and the next run the same day makes it good.
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Metric, Option, Ref } from "effect";

import { AccountDays } from "#billing/application/account-days.ts";
import { AccountChannels } from "#billing/application/ports/account-channels.ts";
import type { PeakRaise } from "#billing/application/ports/account-day-store.ts";
import { BillingAccountStore } from "#billing/application/ports/billing-account-store.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import {
  accountDaysAccounts,
  accountDaysStarted,
  accountDaysStartedDay,
  StartAccountDays,
} from "#billing/application/start-account-days.ts";
import {
  BillingAccount,
  BillingAccountIdSchema,
} from "#billing/domain/billing-account.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

// Five accounts, by id, each its own billing workspace with one account
// connected: three batches of two.
const accounts = Array.from(
  { length: 5 },
  (_, index) =>
    new BillingAccount({
      createdAt: DateTime.makeUnsafe("2026-11-01T00:00:00Z"),
      freeTier: true,
      holder: WorkspaceIdSchema.make(
        `00000000-0000-4000-8000-00000000000${index}`
      ),
      id: BillingAccountIdSchema.make(
        `00000000-0000-7000-8000-00000000000${index}`
      ),
      partnerId: Option.none(),
      payer: Option.none(),
      standalone: false,
    })
);

const StoreTest = Layer.mock(BillingAccountStore, {
  page: (after, limit) =>
    Effect.succeed(
      accounts
        .filter(({ id }) =>
          Option.match(after, {
            onNone: () => true,
            onSome: (last) => id > last,
          })
        )
        .slice(0, limit)
    ),
  workspacesOfEach: (ids) =>
    Effect.succeed(
      new Map(
        accounts
          .filter(({ id }) => ids.includes(id))
          .map(({ holder, id }) => [id, [holder]] as const)
      )
    ),
});

const ChannelsTest = Layer.mock(AccountChannels, {
  ownIn: (workspaceIds) =>
    Effect.succeed(new Map(workspaceIds.map((id) => [id, 1] as const))),
});

// The raises asked for, the second batch of the first run failing.
const raised = Ref.makeUnsafe<readonly (readonly PeakRaise[])[]>([]);

const failSecond = Ref.makeUnsafe(true);

const DaysTest = Layer.mock(AccountDays, {
  raise: (_now, counts) =>
    Effect.gen(function* raise() {
      const before = yield* Ref.get(raised);

      yield* Ref.set(raised, [...before, counts]);

      if (before.length === 1 && (yield* Ref.get(failSecond))) {
        yield* Ref.set(failSecond, false);

        return yield* new DatabaseError({ cause: "synthetic" });
      }

      return [];
    }),
});

const StartTest = StartAccountDays.make(2).pipe(
  Layer.provide(
    Layer.mergeAll(
      StoreTest,
      ChannelsTest,
      DaysTest,
      Layer.succeed(
        BillingMode,
        BillingMode.of({
          enabled: true,
          graceSince: Option.none(),
          graceUntil: Option.none(),
        })
      )
    )
  )
);

const gauge = (of: typeof accountDaysStarted) =>
  Metric.value(of).pipe(Effect.map(({ value }) => value));

layer(StartTest)("starting every billing account's day", (it) => {
  it.effect(
    "goes past a batch that fails, says how many it started, and starts them on its next run",
    () =>
      Effect.gen(function* started() {
        const start = yield* StartAccountDays;

        const first = yield* start.run;

        // Batches one and three: three of the five.
        assert.deepStrictEqual(first, { accounts: 5, started: 3 });
        assert.lengthOf(yield* Ref.get(raised), 3);
        assert.strictEqual(yield* gauge(accountDaysAccounts), 5);
        assert.strictEqual(yield* gauge(accountDaysStarted), 3);
        // Today is not started whole: the day the gauge names is earlier.
        assert.isBelow(
          yield* gauge(accountDaysStartedDay),
          DateTime.toEpochMillis(DateTime.startOf(yield* DateTime.now, "day")) /
            1000
        );

        const second = yield* start.run;

        assert.deepStrictEqual(second, { accounts: 5, started: 5 });
        assert.strictEqual(
          yield* gauge(accountDaysStartedDay),
          DateTime.toEpochMillis(DateTime.startOf(yield* DateTime.now, "day")) /
            1000
        );
      })
  );
});
