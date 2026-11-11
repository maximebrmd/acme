// What the members who manage a workspace's webhooks hear of its endpoints:
// one turned off, always by email, and deliveries failing for good on one
// still on, once a day and by email as they chose.
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { NoticeInbox } from "#notifications/application/notice-inbox.ts";
import { NotificationSettings } from "#notifications/application/notification-settings.ts";
import { newId } from "#shared/application/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { freshWorkspace } from "#test/channels/support.ts";
import {
  freshUser,
  NoticesTest,
  readerOf,
} from "#test/notifications/support.ts";
import { TestDirectory } from "#test/notifications/test-directory.ts";
import { EndpointNotices } from "#webhooks/application/ports/endpoint-notices.ts";
import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";
import { createEndpoint } from "#webhooks/domain/webhook-endpoint.ts";
import { WebhookUrlSchema } from "#webhooks/domain/webhook-url.ts";
import { NotifiedEndpointNotices } from "#webhooks/infrastructure/notified-endpoint-notices.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const Test = NotifiedEndpointNotices.pipe(Layer.provideMerge(NoticesTest));

const noticesOf = (userId: UserId) =>
  NoticeInbox.use((inbox) =>
    inbox.page(readerOf(userId), { after: Option.none(), limit: 50 })
  ).pipe(Effect.map(({ items }) => items.map(({ event }) => event)));

layer(Test, { timeout: 60_000 })("an endpoint's notices", (it) => {
  it.effect(
    "tell once a day that deliveries fail, by id and host, to those who manage webhooks only",
    () =>
      Effect.gen(function* failing() {
        const workspaceId = yield* freshWorkspace;
        const ownerId = yield* freshUser;
        const editorId = yield* freshUser;

        yield* TestDirectory.use((directory) =>
          directory.setMembers(workspaceId, [
            {
              email: `member+${ownerId}@example.test`,
              locale: "en",
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

        const endpoint = createEndpoint(
          // Its own each run: a notice's key is kept for good.
          yield* newId(WebhookEndpointIdSchema),
          workspaceId,
          {
            description: "",
            enabled: true,
            eventTypes: ["post.published"],
            url: WebhookUrlSchema.make(
              "https://hooks.example.com/peal?token=synthetic"
            ),
          },
          DateTime.makeUnsafe("2026-06-01T00:00:00Z")
        );

        const notices = yield* EndpointNotices;

        yield* notices.failing(
          endpoint,
          DateTime.makeUnsafe("2026-06-15T08:00:00Z")
        );
        yield* notices.failing(
          endpoint,
          DateTime.makeUnsafe("2026-06-15T23:59:00Z")
        );
        yield* notices.failing(
          endpoint,
          DateTime.makeUnsafe("2026-06-16T00:01:00Z")
        );

        const told = yield* noticesOf(ownerId);

        assert.deepStrictEqual(told, [
          {
            _tag: "WebhookDeliveriesFailing",
            endpointId: endpoint.id,
            host: "hooks.example.com",
          },
          {
            _tag: "WebhookDeliveriesFailing",
            endpointId: endpoint.id,
            host: "hooks.example.com",
          },
        ]);
        assert.notInclude(JSON.stringify(told), "synthetic");
        assert.deepStrictEqual(yield* noticesOf(editorId), []);
      })
  );

  it.effect("email it as the reader chose", () =>
    Effect.gen(function* chosen() {
      const ownerId = yield* freshUser;
      const settings = yield* NotificationSettings;

      const defaults = yield* settings.get(readerOf(ownerId));

      assert.isTrue(defaults.email.webhookFailing);

      const off = yield* settings.change(readerOf(ownerId), {
        email: { webhookFailing: false },
      });

      assert.isFalse(off.email.webhookFailing);
    })
  );
});
