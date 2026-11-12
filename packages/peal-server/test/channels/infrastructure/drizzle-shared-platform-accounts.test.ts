// The platform accounts connected in several workspaces, on Postgres: by
// platform then id, each with the workspaces that hold it, and none held
// by one workspace alone.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { SharedPlatformAccounts } from "#channels/application/shared-platform-accounts.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleSharedPlatformAccounts } from "#channels/infrastructure/drizzle-shared-platform-accounts.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  syntheticCredentials,
} from "#test/channels/support.ts";

const SharedTest = Layer.mergeAll(
  DrizzleSharedPlatformAccounts,
  DrizzleChannelRepository
).pipe(Layer.provideMerge(DatabaseTest));

const connected = Effect.fn("connected")(function* connected(
  workspaceId: WorkspaceId,
  accountId: string
) {
  const channel = yield* freshChannel(workspaceId, { accountId });

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, syntheticCredentials(channel))
  );
});

layer(SharedTest)("platform accounts in several workspaces", (it) => {
  it.effect("are listed with their workspaces, by platform then id", () =>
    Effect.gen(function* listed() {
      const shared = yield* SharedPlatformAccounts;
      // Ids of their own, after which nothing other suites store sorts.
      const prefix = `synthetic-${randomUUID()}`;

      const [first, second, third] = [
        yield* freshWorkspace,
        yield* freshWorkspace,
        yield* freshWorkspace,
      ];

      yield* connected(first, `${prefix}-a`);
      yield* connected(second, `${prefix}-a`);
      yield* connected(third, `${prefix}-b`);
      yield* connected(first, `${prefix}-c`);
      yield* connected(third, `${prefix}-c`);

      const after = Option.some({
        accountId: prefix,
        platform: "mastodon" as const,
      });

      const page = yield* shared.page(after, 2);

      assert.deepStrictEqual(page, [
        {
          accountId: `${prefix}-a`,
          platform: "mastodon",
          workspaceIds: [first, second].toSorted(),
        },
        {
          accountId: `${prefix}-c`,
          platform: "mastodon",
          workspaceIds: [first, third].toSorted(),
        },
      ]);

      const next = yield* shared.page(
        Option.some({ accountId: `${prefix}-a`, platform: "mastodon" }),
        1
      );

      assert.strictEqual(next[0]?.accountId, `${prefix}-c`);
    })
  );
});
