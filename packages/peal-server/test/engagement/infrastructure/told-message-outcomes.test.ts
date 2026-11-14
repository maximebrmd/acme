import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { MessageOutcomes } from "#engagement/application/ports/message-outcomes.ts";
import { followBox } from "#engagement/domain/message-box.ts";
import {
  settleMessage,
  writeMessage,
} from "#engagement/domain/outgoing-message.ts";
import { ToldMessageOutcomes } from "#engagement/infrastructure/told-message-outcomes.ts";
import { Notify } from "#notifications/application/notify.ts";
import type { NoticeRequest } from "#notifications/application/notify.ts";
import { Ids } from "#shared/application/ids.ts";
import { freshChannel } from "#test/channels/support.ts";
import {
  channelId,
  conversation,
  directMessage,
  memberId,
  messageBox,
  messagedAt,
  outgoingMessageId,
  workspaceId,
} from "#test/engagement/support.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import type { EventToPublish } from "#webhooks/application/webhook-events.ts";

// What a workspace is told of its direct messages: ids, a channel's
// handle and a count. A message is private correspondence: neither an
// event nor a notice may hold what it says, nor who sent it.

const secret = "A synthetic message nobody outside the inbox may read.";

const told = () => {
  const events: EventToPublish[] = [];
  const notices: NoticeRequest[] = [];

  const layer = ToldMessageOutcomes.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(
          WebhookEvents,
          WebhookEvents.of({
            publish: (request) =>
              Effect.sync(() => {
                events.push(request);
              }),
          })
        ),
        Layer.mock(Notify, {
          notify: (request) =>
            Effect.sync(() => {
              notices.push(request);
            }),
        }),
        Layer.mock(ChannelRepository, {
          findById: () =>
            freshChannel(workspaceId).pipe(
              Effect.map(Option.some),
              Effect.provide(Ids.layerTest)
            ),
        })
      )
    )
  );

  return { events, layer, notices };
};

describe("the direct messages' outcomes", () => {
  it.effect(
    "tell of new messages by ids, and members of a new message on the channel",
    () => {
      const { events, layer, notices } = told();
      const talk = conversation(1);

      const received = directMessage(1, {
        senderPlatformId: Option.some("7001"),
        text: secret,
      });

      return Effect.gen(function* tells() {
        yield* MessageOutcomes.use((outcomes) =>
          outcomes.received(talk, [received])
        );

        const [event] = events;

        assert.deepStrictEqual(
          Object.keys(event?.event.data ?? {}).toSorted(),
          [
            "channelId",
            "conversationId",
            "messageId",
            "receivedAt",
            "workspaceId",
          ]
        );
        assert.notInclude(JSON.stringify(events), secret);
        assert.notInclude(JSON.stringify(events), "7001");

        const [notice] = notices;

        assert.deepInclude(notice?.event, {
          _tag: "MessagesReceived",
          channel: { handle: "@peal_example", platform: "mastodon" },
          count: 1,
        });
        assert.strictEqual(notice?.key, `messages:${talk.id}:2026-11-12`);
        assert.notInclude(JSON.stringify(notices), secret);
        assert.notInclude(JSON.stringify(notices), "reader1");
      }).pipe(Effect.provide(layer));
    }
  );

  it.effect("tell of a message sent, and of none that failed", () => {
    const { events, layer } = told();
    const talk = conversation(1);

    const written = writeMessage(
      outgoingMessageId(1),
      talk,
      Option.some(memberId),
      secret,
      messagedAt
    );

    return Effect.gen(function* sent() {
      yield* MessageOutcomes.use((outcomes) =>
        Effect.all([
          outcomes.settled(
            talk,
            Result.getOrThrow(
              settleMessage(
                written,
                { _tag: "sent", platformMessageId: "m1" },
                messagedAt
              )
            )
          ),
          outcomes.settled(
            talk,
            Result.getOrThrow(
              settleMessage(
                written,
                { _tag: "failed", reason: "refused" },
                messagedAt
              )
            )
          ),
        ])
      );

      assert.deepStrictEqual(
        events.map(({ event }) => event.type),
        ["message.sent"]
      );
      assert.notInclude(JSON.stringify(events), secret);
    }).pipe(Effect.provide(layer));
  });

  it.effect(
    "tell who may connect channels that a channel's messages were turned off, once each time they were on",
    () => {
      const { events, layer, notices } = told();
      const first = messageBox();

      // Turned on again an hour later the same day, and off again.
      const again = followBox(
        { channelId: channelId(1), workspaceId },
        DateTime.addDuration(messagedAt, "1 hour")
      );

      return Effect.gen(function* turnedOff() {
        yield* MessageOutcomes.use((outcomes) =>
          Effect.all([outcomes.turnedOff(first), outcomes.turnedOff(again)])
        );

        assert.deepStrictEqual(notices[0]?.event, {
          _tag: "MessagesTurnedOff",
          channel: { handle: "@peal_example", platform: "mastodon" },
        });
        assert.deepStrictEqual(
          notices.map(({ key }) => key),
          [
            `messages-off:${channelId(1)}:${DateTime.formatIso(first.createdAt)}`,
            `messages-off:${channelId(1)}:${DateTime.formatIso(again.createdAt)}`,
          ]
        );
        assert.lengthOf(events, 0);
      }).pipe(Effect.provide(layer));
    }
  );
});
