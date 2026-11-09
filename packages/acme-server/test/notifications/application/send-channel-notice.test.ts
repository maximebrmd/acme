import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Duration, Effect, Layer, Ref } from "effect";

import { ChannelNotices } from "#channels/application/channel-notices.ts";
import { markRefreshNeeded } from "#channels/domain/channel.ts";
import { NotifiedChannelNotices } from "#channels/infrastructure/notified-channel-notices.ts";
import { MailDeliveryFailed } from "#notifications/application/mail-delivery-failed.ts";
import { Mailer } from "#notifications/application/mailer.ts";
import type { EmailMessage } from "#notifications/application/mailer.ts";
import { NoticeRecipients } from "#notifications/application/notice-recipients.ts";
import { SendChannelNotice } from "#notifications/application/send-channel-notice.ts";
import { DrizzleNoticeLog } from "#notifications/infrastructure/drizzle-notice-log.ts";
import { PublicAppLinks } from "#notifications/infrastructure/public-app-links.ts";
import {
  DatabaseTest,
  freshChannel,
  freshWorkspace,
} from "#test/channels/support.ts";

// A mailer that records what it sends, and refuses while `down` holds.
class TestMailer extends Context.Service<
  TestMailer,
  {
    readonly sent: Effect.Effect<readonly EmailMessage[]>;
    readonly setDown: (down: boolean) => Effect.Effect<void>;
  }
>()("acme-server/test/notifications/TestMailer") {
  static readonly layer = Layer.effectContext(
    Effect.gen(function* TestMailerLive() {
      const sent = yield* Ref.make<readonly EmailMessage[]>([]);
      const down = yield* Ref.make(false);

      return Context.make(
        Mailer,
        Mailer.of({
          send: (message) =>
            Ref.get(down).pipe(
              Effect.flatMap((refusing) =>
                refusing
                  ? Effect.fail(
                      new MailDeliveryFailed({
                        cause: new Error("Relay access denied"),
                        retryable: false,
                      })
                    )
                  : Ref.update(sent, (all) => [...all, message])
              )
            ),
        })
      ).pipe(
        Context.add(
          TestMailer,
          TestMailer.of({
            sent: Ref.get(sent),
            setDown: (refusing) => Ref.set(down, refusing),
          })
        )
      );
    })
  );
}

// Two members manage the workspace's channels, one reading French.
const Recipients = Layer.succeed(
  NoticeRecipients,
  NoticeRecipients.of({
    channelManagers: () =>
      Effect.succeed({
        recipients: [
          { email: "ada@example.test", id: "user-ada", locale: "en" },
          { email: "chloe@example.test", id: "user-chloe", locale: "fr" },
        ],
        workspaceName: "Studio Nord",
      }),
  })
);

const NoticesTest = NotifiedChannelNotices.pipe(
  Layer.provideMerge(SendChannelNotice.layer),
  Layer.provideMerge(
    Layer.mergeAll(DrizzleNoticeLog, PublicAppLinks, Recipients)
  ),
  Layer.provideMerge(TestMailer.layer),
  Layer.provideMerge(DatabaseTest)
);

const sentTo = (workspaceId: string) =>
  TestMailer.use((mailer) => mailer.sent).pipe(
    Effect.map((sent) =>
      sent.filter((message) => message.html.includes(workspaceId))
    )
  );

layer(NoticesTest)("channel notices", (it) => {
  it.effect("email each manager once per event, in their language", () =>
    Effect.gen(function* once() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;

      const channel = markRefreshNeeded(
        yield* freshChannel(workspaceId, { platform: "mastodon" }),
        now
      );

      const notices = yield* ChannelNotices;

      yield* notices.reconnectRequired(channel);
      yield* notices.reconnectRequired(channel);

      const sent = yield* sentTo(workspaceId);

      assert.deepStrictEqual(
        sent.map(({ subject, to }) => ({ subject, to })),
        [
          {
            subject: "Reconnect @acme_example on Mastodon",
            to: "ada@example.test",
          },
          {
            subject: "Reconnectez @acme_example sur Mastodon",
            to: "chloe@example.test",
          },
        ]
      );
      assert.include(
        sent[1]?.text ?? "",
        `http://localhost:3001/fr/app/${workspaceId}/channels`
      );
      assert.include(
        sent[0]?.text ?? "",
        `http://localhost:3001/app/${workspaceId}/channels`
      );
      // Each email has its own key, the same however often it is sent.
      assert.notStrictEqual(sent[0]?.idempotencyKey, sent[1]?.idempotencyKey);
    })
  );

  it.effect("warn again for a new expiry, not for the same one", () =>
    Effect.gen(function* perExpiry() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;

      const channel = yield* freshChannel(workspaceId, {
        platform: "linkedin",
      });

      const notices = yield* ChannelNotices;
      const first = DateTime.addDuration(now, Duration.days(6));
      const next = DateTime.addDuration(now, Duration.days(66));

      yield* notices.reconnectSoon(channel, first);
      yield* notices.reconnectSoon(channel, first);
      yield* notices.reconnectSoon(channel, next);

      assert.lengthOf(yield* sentTo(workspaceId), 4);
    })
  );

  it.effect("send a notice nobody received the next time", () =>
    Effect.gen(function* retries() {
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;

      const channel = markRefreshNeeded(
        yield* freshChannel(workspaceId, { platform: "mastodon" }),
        now
      );

      const notices = yield* ChannelNotices;
      const mailer = yield* TestMailer;

      yield* mailer.setDown(true);
      yield* notices.reconnectRequired(channel);
      yield* mailer.setDown(false);

      assert.lengthOf(yield* sentTo(workspaceId), 0);

      yield* notices.reconnectRequired(channel);

      assert.lengthOf(yield* sentTo(workspaceId), 2);
    })
  );
});
