// A person's workspaces hold their channels against one plan: their
// billing account's, counted across all of them, under the account's
// hold, as a partner's pool is under the partner's.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { BillingAccounts } from "#billing/application/billing-accounts.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { AccountPlanPoolsLive } from "#billing/infrastructure/account-plan-pools.ts";
import { ChannelEvents } from "#channels/application/channel-events.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleConnectAttempts } from "#channels/infrastructure/drizzle-connect-attempts.ts";
import { DrizzleConnectChoices } from "#channels/infrastructure/drizzle-connect-choices.ts";
import { AccountChannelAllowanceLive } from "#channels/infrastructure/plan-channel-allowance.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import {
  accountsTest,
  cleanUpAccounts,
  everyWorkspaceOn,
  partnerOf,
  person,
  UnmeteredTest,
  workspaceOwnedBy,
} from "#test/billing/support.ts";
import {
  MastodonAuthorizersTest,
  mastodonInstance,
} from "#test/channels/connect-support.ts";
import {
  actorIn,
  freshChannel,
  OpenOutboundGuard,
  syntheticCredentials,
  TokenCipherTest,
} from "#test/channels/support.ts";
import { PartnerOwnershipLive } from "#workspace/container.ts";

// The free plan, which allows 2 accounts, shared across billing accounts.
const AccountFreePlanTest = Layer.mergeAll(
  ConnectChannel.layer,
  ChannelUsage.layer
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleChannelRepository,
      ChannelEvents.none,
      DrizzleConnectAttempts,
      DrizzleConnectChoices,
      SqlChannelLocks,
      AccountChannelAllowanceLive.pipe(
        Layer.provide(
          AccountPlanPoolsLive.pipe(
            Layer.provide(PartnerOwnershipLive),
            Layer.provide(
              Layer.succeed(
                BillingMode,
                BillingMode.of({ enabled: true, graceUntil: Option.none() })
              )
            )
          )
        ),
        Layer.provide(everyWorkspaceOn("free"))
      ),
      MastodonAuthorizersTest.pipe(Layer.provide(OpenOutboundGuard))
    )
  ),
  Layer.provideMerge(TokenCipherTest),
  Layer.provideMerge(accountsTest)
);

const freeChannels = 2;

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

const callbackOf = (back: {
  readonly code?: string;
  readonly state: string;
}): AuthorizationCallback => ({
  code: Option.fromUndefinedOr(back.code),
  error: Option.none(),
  issuer: Option.none(),
  state: back.state,
});

const fill = Effect.fn("fill")(function* fill(
  workspaceId: WorkspaceId,
  count: number
) {
  const repository = yield* ChannelRepository;

  for (let added = 0; added < count; added += 1) {
    const channel = yield* freshChannel(workspaceId);

    yield* repository.insert(channel, syntheticCredentials(channel));
  }
});

// Two workspaces of one person, the first made first.
const twoOfOne = Effect.gen(function* twoOfOne() {
  const payer = yield* person;

  return [
    yield* workspaceOwnedBy([payer]),
    yield* workspaceOwnedBy([payer]),
  ] as const;
});

layer(AccountFreePlanTest)("a person's workspaces on one plan", (it) => {
  it.effect("refuse a third account in either, two taken across them", () =>
    Effect.gen(function* full() {
      const instance = yield* mastodonInstance();
      const connect = yield* ConnectChannel;
      const usage = yield* ChannelUsage;
      const [first, second] = yield* twoOfOne;

      yield* fill(first, 1);
      yield* fill(second, 1);

      for (const workspaceId of [first, second]) {
        const refused = yield* connect
          .start(manager(workspaceId), "mastodon", {
            connection: Option.none(),
            handle: Option.none(),
            instance: Option.some(instance.url),
          })
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          refused,
          new PlanLimitReached({
            allowed: freeChannels,
            limit: "channels",
            needed: freeChannels + 1,
            used: freeChannels,
          })
        );
      }

      assert.deepStrictEqual(
        yield* Effect.all([usage.connected(first), usage.connected(second)]),
        [freeChannels, freeChannels]
      );

      const across = yield* usage.connectedAcross([first, second]);

      assert.deepStrictEqual(
        [across.get(first), across.get(second)],
        [freeChannels, freeChannels]
      );

      yield* cleanUpAccounts([first, second]);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "add two in all when three of them connect at once, while one schedules",
    () =>
      Effect.gen(function* raced() {
        const instance = yield* mastodonInstance();
        const connect = yield* ConnectChannel;
        const usage = yield* ChannelUsage;
        const { transaction } = yield* TransactionRunner;
        const payer = yield* person;

        const workspaces = yield* Effect.all(
          Array.from({ length: 3 }, () => workspaceOwnedBy([payer]))
        );

        // Each started while the free tier's two were free.
        const started = yield* Effect.all(
          workspaces.map((workspaceId) =>
            connect
              .start(manager(workspaceId), "mastodon", {
                connection: Option.none(),
                handle: Option.none(),
                instance: Option.some(instance.url),
              })
              .pipe(Effect.map((url) => ({ url, workspaceId })))
          )
        );

        // Scheduling counts the account's channels in its own
        // transaction, under the account's hold, as publishing does.
        const scheduling = (workspaceId: WorkspaceId) =>
          transaction(usage.connected(workspaceId)).pipe(Effect.result);

        const ended = yield* Effect.all(
          [
            ...started.map(({ url, workspaceId }) =>
              connect
                .complete(
                  manager(workspaceId),
                  "mastodon",
                  callbackOf(instance.approve(url))
                )
                .pipe(Effect.result)
            ),
            ...workspaces.map(scheduling),
          ],
          { concurrency: "unbounded" }
        );

        assert.deepStrictEqual(
          ended
            .slice(0, workspaces.length)
            .map(({ _tag }) => _tag)
            .toSorted(),
          ["Failure", "Success", "Success"]
        );

        const own = yield* usage.connectedIn(workspaces);

        assert.strictEqual(
          [...own.values()].reduce((sum, count) => sum + count, 0),
          freeChannels
        );

        yield* cleanUpAccounts(workspaces);
      }).pipe(Effect.scoped)
  );

  it.effect("count a partner's pool apart from its owner's account", () =>
    Effect.gen(function* partners() {
      const usage = yield* ChannelUsage;
      const owner = yield* person;
      const home = yield* workspaceOwnedBy([owner]);
      const personal = yield* workspaceOwnedBy([owner]);
      const customer = yield* workspaceOwnedBy([]);

      yield* partnerOf(home, [customer]);
      yield* fill(home, 1);
      yield* fill(customer, 1);
      yield* fill(personal, 1);

      assert.deepStrictEqual(
        yield* Effect.all([
          usage.connected(home),
          usage.connected(customer),
          usage.connected(personal),
        ]),
        [2, 2, 1]
      );

      yield* cleanUpAccounts([home, personal, customer]);
    })
  );
});

// A server that does not bill: the count decides nothing, so no billing
// account is read, made or held. Any call to the accounts dies.
const UnbilledTest = ChannelUsage.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleChannelRepository,
      AccountChannelAllowanceLive.pipe(
        Layer.provide(
          AccountPlanPoolsLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                PartnerOwnershipLive,
                Layer.mock(BillingAccounts, {}),
                Layer.succeed(
                  BillingMode,
                  BillingMode.of({ enabled: false, graceUntil: Option.none() })
                )
              )
            )
          )
        ),
        Layer.provide(UnmeteredTest)
      )
    )
  ),
  Layer.provideMerge(TokenCipherTest),
  Layer.provideMerge(accountsTest)
);

layer(UnbilledTest)(
  "a person's workspaces on a server that does not bill",
  (it) => {
    it.effect(
      "count each workspace's own channels, touching no billing account",
      () =>
        Effect.gen(function* unbilled() {
          const usage = yield* ChannelUsage;
          const [first, second] = yield* twoOfOne;

          yield* fill(first, 2);
          yield* fill(second, 1);

          assert.deepStrictEqual(
            yield* Effect.all([
              usage.connected(first),
              usage.connected(second),
            ]),
            [2, 1]
          );

          const across = yield* usage.connectedAcross([first, second]);

          assert.deepStrictEqual(
            [across.get(first), across.get(second)],
            [2, 1]
          );
          assert.lengthOf(
            yield* SqlClient.SqlClient.use(
              (sql) =>
                sql`SELECT 1 FROM billing.account_workspaces WHERE workspace_id IN (${first}, ${second})`
            ).pipe(Effect.orDie),
            0
          );

          yield* cleanUpAccounts([first, second]);
        })
    );
  }
);
