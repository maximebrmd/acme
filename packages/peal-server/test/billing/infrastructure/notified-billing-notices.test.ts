// Billing's notices reach the members who manage billing, in the app and by
// email, whatever they chose to receive by email: reminders and
// confirmations the law asks for.
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { BillingNotices } from "#billing/application/ports/billing-notices.ts";
import { NotifiedBillingNoticesLive } from "#billing/infrastructure/notified-billing-notices.ts";
import { DeliverNoticeEmails } from "#notifications/application/deliver-notice-emails.ts";
import { NoticeInbox } from "#notifications/application/notice-inbox.ts";
import { NotificationSettings } from "#notifications/application/notification-settings.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { freshWorkspace } from "#test/channels/support.ts";
import {
  freshUser,
  NoticesTest,
  readerOf,
  sentTo,
} from "#test/notifications/support.ts";
import { TestDirectory } from "#test/notifications/test-directory.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const Test = NotifiedBillingNoticesLive.pipe(Layer.provideMerge(NoticesTest));

const kindsOf = (userId: UserId) =>
  NoticeInbox.use((inbox) =>
    inbox.page(readerOf(userId), { after: Option.none(), limit: 50 })
  ).pipe(Effect.map(({ items }) => items.map(({ event }) => event._tag)));

layer(Test, { timeout: 60_000 })("billing's notices", (it) => {
  it.effect(
    "tell the members who manage billing, by email even when they turned emails off",
    () =>
      Effect.gen(function* tells() {
        const workspaceId = yield* freshWorkspace;
        const ownerId = yield* freshUser;
        const editorId = yield* freshUser;
        const ownerEmail = `member+${ownerId}@example.test`;

        yield* TestDirectory.use((directory) =>
          directory.setMembers(workspaceId, [
            {
              email: ownerEmail,
              locale: "fr",
              permissions: permissionsFor("owner"),
              userId: ownerId,
            },
            {
              email: `member+${editorId}@example.test`,
              locale: "en",
              permissions: permissionsFor("editor"),
              userId: editorId,
            },
          ])
        );

        yield* NotificationSettings.use((settings) =>
          settings.change(readerOf(ownerId), {
            email: {
              channelReconnect: false,
              postFailed: false,
              postPublished: false,
              postUnconfirmed: false,
            },
          })
        );

        const key = `subscription:sub_${ownerId}:cancelled`;

        yield* BillingNotices.use((notices) =>
          notices.tell({
            key,
            notice: {
              _tag: "SubscriptionCancelled",
              endsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
              plan: "pro",
            },
            workspaceId,
          })
        );

        assert.deepStrictEqual(yield* kindsOf(ownerId), [
          "SubscriptionCancelled",
        ]);
        assert.deepStrictEqual(yield* kindsOf(editorId), []);

        yield* DeliverNoticeEmails.use((emails) => emails.deliver(key));

        const [email] = yield* sentTo(ownerEmail);

        assert.strictEqual(
          email?.subject,
          "Votre abonnement Pro est résilié : il prend fin le 1 décembre 2026 à 00:00 UTC"
        );
      })
  );
});
