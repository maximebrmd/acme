import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { ChannelEvents } from "#channels/application/channel-events.ts";
import { engagementChannelEvents } from "#channels/infrastructure/engagement-channel-events.ts";
import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

// A channel gone is told to engagement in the transaction that deletes
// it, after those who heard of it before: the comments a bounding
// platform gave under its posts leave with it.

const channel = {
  accountId: "UCsyntheticChannel000001",
  id: ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c9"),
  platform: "youtube" as const,
  workspaceId: WorkspaceIdSchema.make("01900000-0000-7000-8000-0000000000f9"),
};

describe("a channel gone, as engagement hears it", () => {
  it.effect("forgets its bounded comments, after the events before", () =>
    Effect.gen(function* told() {
      const heard = yield* Ref.make<readonly string[]>([]);

      const before = Layer.succeed(
        ChannelEvents,
        ChannelEvents.of({
          connected: () => Effect.void,
          disabled: () => Effect.void,
          disconnected: (gone, cause) =>
            Ref.update(heard, (all) => [...all, `${cause}:${gone.id}`]),
          enabled: () => Effect.void,
        })
      );

      const records = Layer.succeed(
        EngagementRecords,
        EngagementRecords.of({
          channelGone: (channelId, platform, at) =>
            Ref.update(heard, (all) => [
              ...all,
              `gone:${channelId}:${platform}:${DateTime.formatIso(at)}`,
            ]),
          eraseWorkspace: () => Effect.void,
          exportUser: () => Effect.succeed([]),
          forgetUser: () => Effect.void,
          postRemoved: () => Effect.void,
        })
      );

      yield* ChannelEvents.use((events) =>
        events.disconnected(channel, "member")
      ).pipe(
        Effect.provide(
          engagementChannelEvents(before).pipe(Layer.provide(records))
        )
      );

      const all = yield* Ref.get(heard);

      assert.deepStrictEqual(all[0], `member:${channel.id}`);
      assert.isTrue(
        Option.exists(Option.fromUndefinedOr(all[1]), (line) =>
          line.startsWith(`gone:${channel.id}:youtube:`)
        )
      );
    })
  );
});
