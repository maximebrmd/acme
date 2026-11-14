// Moving a channel between two workspaces of one pool: a new channel in
// the workspace it goes to, with the same account and tokens bound to its
// new id, and none left where it was.
import { assert, layer } from "@effect/vitest";
import { Context, Effect, Layer, Option, Redacted, Ref } from "effect";

import { ChannelAllowance } from "#channels/application/channel-allowance.ts";
import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelEvents } from "#channels/application/channel-events.ts";
import { ChannelMoves } from "#channels/application/channel-moves.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import {
  decryptTokens,
  encryptTokens,
} from "#channels/application/channel-tokens.ts";
import { TokenCipher } from "#channels/application/token-cipher.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
  TokenCipherTest,
} from "#test/channels/support.ts";
import { TransactionsTest } from "#test/notifications/support.ts";

/** What the move told, in order: the channels events and billing heard. */
class Told extends Context.Service<Told, Ref.Ref<readonly string[]>>()(
  "peal-server/test/ChannelMovesTold"
) {}

const ToldTest = Layer.effect(Told, Ref.make<readonly string[]>([]));

const tell = (line: string) =>
  Told.use((told) => Ref.update(told, (lines) => [...lines, line]));

// Events and billing that keep what they hear; the pool is the two
// workspaces of each test, which `counted` reads.
const HeardTest = Layer.mergeAll(
  Layer.effect(
    ChannelEvents,
    Effect.gen(function* heard() {
      const told = yield* Told;

      const say = (line: string) =>
        Ref.update(told, (lines) => [...lines, line]);

      return ChannelEvents.of({
        connected: (channel, reconnected) =>
          say(`connected ${channel.workspaceId} ${String(reconnected)}`),
        disabled: () => Effect.void,
        disconnected: (channel, cause) =>
          say(`disconnected ${channel.workspaceId} ${cause}`),
        enabled: () => Effect.void,
      });
    })
  ),
  Layer.effect(
    ChannelAllowance,
    Effect.gen(function* allowance() {
      const told = yield* Told;

      return ChannelAllowance.of({
        channels: () => Effect.succeed(Option.none()),
        counted: (workspaceId, pooled) =>
          pooled.pipe(
            Effect.flatMap((count) =>
              Ref.update(told, (lines) => [
                ...lines,
                `counted ${workspaceId} ${String(count)}`,
              ])
            )
          ),
        passedThrough: () => Effect.succeedNone,
        sharedWith: () => Effect.succeed([]),
        sharingIn: () => Effect.succeed(new Map()),
      });
    })
  )
).pipe(Layer.provideMerge(ToldTest));

const MovesTest = ChannelMoves.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleChannelRepository,
      SqlChannelLocks,
      TokenCipherTest,
      HeardTest,
      TransactionsTest
    )
  ),
  Layer.provideMerge(DatabaseTest)
);

// A channel of the workspace with real tokens, a Page manager's grant and
// a token owner, as LinkedIn pages and Facebook Pages keep them.
const stored = Effect.fn("stored")(function* stored(workspaceId: WorkspaceId) {
  const channel = yield* freshChannel(workspaceId);
  const repository = yield* ChannelRepository;

  const credentials = yield* encryptTokens(
    {
      accessToken: Redacted.make(`synthetic-access-${channel.id}`),
      expiresAt: Option.none(),
      grantedBy: "synthetic-manager",
      refreshToken: Option.some(
        Redacted.make(`synthetic-refresh-${channel.id}`)
      ),
      renewable: true,
      scopes: [],
      tokenOwner: "synthetic-owner",
    },
    channel.id
  );

  yield* repository.insert(channel, credentials);
  yield* repository.setLabel(
    workspaceId,
    channel.id,
    Option.some("Old name"),
    channel.updatedAt
  );

  return channel;
});

const moveOf = (channel: Channel, to: WorkspaceId) =>
  ChannelMoves.use((moves) =>
    moves.move({
      channelId: channel.id,
      from: channel.workspaceId,
      inside: tell("inside"),
      to,
    })
  );

layer(MovesTest)("moving a channel", (it) => {
  it.effect(
    "makes it a channel of the other workspace, its tokens bound to its new id",
    () =>
      Effect.gen(function* moves() {
        const repository = yield* ChannelRepository;
        const cipher = yield* TokenCipher;
        const from = yield* freshWorkspace;
        const to = yield* freshWorkspace;
        const channel = yield* stored(from);

        yield* Told.use((told) => Ref.set(told, []));

        const moved = yield* moveOf(channel, to);

        assert.notStrictEqual(moved.id, channel.id);
        assert.strictEqual(moved.workspaceId, to);
        assert.deepInclude(moved, {
          accountId: channel.accountId,
          handle: channel.handle,
          platform: channel.platform,
          scopes: channel.scopes,
          status: channel.status,
          token: channel.token,
        });
        // Its name was the other workspace's.
        assert.isTrue(Option.isNone(moved.label));

        // Gone where it was, there where it went.
        assert.isTrue(
          Option.isNone(yield* repository.findById(from, channel.id))
        );
        assert.isTrue(Option.isSome(yield* repository.findById(to, moved.id)));
        assert.isTrue(Option.isNone(yield* repository.credentials(channel.id)));

        const credentials = yield* repository.credentials(moved.id);

        assert(Option.isSome(credentials));
        assert.deepInclude(credentials.value, {
          grantedBy: "synthetic-manager",
          tokenOwner: "synthetic-owner",
        });

        const tokens = yield* decryptTokens(credentials.value, moved.id);

        assert.strictEqual(
          Redacted.value(tokens.accessToken),
          `synthetic-access-${channel.id}`
        );
        assert.strictEqual(
          Option.getOrNull(
            tokens.refreshToken.pipe(Option.map(Redacted.value))
          ),
          `synthetic-refresh-${channel.id}`
        );

        // Bound to the new id: read as the old channel's, it opens nothing.
        const asBefore = yield* cipher
          .decrypt(credentials.value.accessToken, channel.id)
          .pipe(Effect.flip);

        assert.strictEqual(asBefore._tag, "TokenAuthenticationFailed");

        // Inside the move's transaction, after what the caller checks: gone
        // from the one, added to the other and counted with its pool.
        assert.deepStrictEqual(yield* Told.use(Ref.get), [
          "inside",
          `disconnected ${from} moved`,
          `counted ${to} 1`,
          `connected ${to} false`,
        ]);
      })
  );

  it.effect("leaves everything as it was when the caller's check fails", () =>
    Effect.gen(function* refused() {
      const repository = yield* ChannelRepository;
      const from = yield* freshWorkspace;
      const to = yield* freshWorkspace;
      const channel = yield* stored(from);

      const failure = yield* ChannelMoves.use((moves) =>
        moves.move({
          channelId: channel.id,
          from,
          inside: Effect.fail("synthetic refusal" as const),
          to,
        })
      ).pipe(Effect.flip);

      assert.strictEqual(failure, "synthetic refusal");
      assert.isTrue(
        Option.isSome(yield* repository.findById(from, channel.id))
      );
      assert.lengthOf(yield* repository.list(to), 0);
    })
  );

  it.effect(
    "refuses a workspace that has a channel of the account, and changes nothing",
    () =>
      Effect.gen(function* taken() {
        const repository = yield* ChannelRepository;
        const from = yield* freshWorkspace;
        const to = yield* freshWorkspace;
        const channel = yield* stored(from);

        const there = yield* freshChannel(to, { accountId: channel.accountId });

        yield* repository.insert(
          there,
          new ChannelCredentials({
            accessToken: (yield* encryptTokens(
              {
                accessToken: Redacted.make("synthetic-access"),
                expiresAt: Option.none(),
                refreshToken: Option.none(),
                renewable: false,
                scopes: [],
              },
              there.id
            )).accessToken,
            refreshToken: Option.none(),
          })
        );

        const failure = yield* moveOf(channel, to).pipe(Effect.flip);

        assert.deepInclude(failure, {
          _tag: "ChannelAccountTaken",
          channelId: there.id,
        });
        assert.isTrue(
          Option.isSome(yield* repository.findById(from, channel.id))
        );

        // Moving it where it is finds it there already.
        const same = yield* moveOf(channel, from).pipe(Effect.flip);

        assert.deepInclude(same, {
          _tag: "ChannelAccountTaken",
          channelId: channel.id,
        });
      })
  );

  it.effect("finds no channel of another workspace", () =>
    Effect.gen(function* elsewhere() {
      const other = yield* freshWorkspace;
      const channel = yield* stored(other);
      const from = yield* freshWorkspace;
      const to = yield* freshWorkspace;

      const failure = yield* ChannelMoves.use((moves) =>
        moves.move({ channelId: channel.id, from, inside: Effect.void, to })
      ).pipe(Effect.flip);

      assert.strictEqual(failure._tag, "ChannelNotFound");
    })
  );
});
