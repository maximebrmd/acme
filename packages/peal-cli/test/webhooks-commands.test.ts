import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { maxWebhookEndpoints } from "peal-contract";

import { filesLayer, signedIn } from "./signed-in.ts";
import {
  deliveredId,
  exhaustedDeliveryId,
  failingHookId,
  hookId,
  pendingDeliveryId,
  webhooks,
} from "./studio.ts";
import type { Studio } from "./studio.ts";

// peal webhooks, against the in-memory studio: what each subcommand asks
// the server, what it prints, and how it explains a refusal.

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const inStudio = ["--workspace", "studio"];

const firstSecret = "whsec_c3ludGhldGljLXNlY3JldC0x";

const newHookId = "0190f3a0-0000-7000-8000-00000000b003";

const create = (...rest: readonly string[]) => [
  "webhooks",
  "create",
  ...rest,
  ...inStudio,
];

describe("peal webhooks", () => {
  it.effect("lists the endpoints, and says why one is off", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();
      const listed = yield* session.printed(["webhooks", "list", ...inStudio]);

      assert.include(listed, "Webhook endpoints of Studio:");
      assert.match(
        listed,
        new RegExp(
          `${hookId}\\s+on, failing since 2026-11-09T11:00:00Z\\s+https://hooks\\.example\\.com/peal\\s+post\\.published, post\\.failed\\s+Synthetic receiver`,
          "u"
        )
      );
      assert.match(
        listed,
        new RegExp(
          `${failingHookId}\\s+off: every delivery failed for 5 days\\s+https://hooks\\.example\\.com/old\\s+media\\.ready`,
          "u"
        )
      );
      assert.notInclude(listed, "whsec_");
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("tells a member who may not read them", () =>
    Effect.gen(function* viewer() {
      const session = yield* signedIn();

      for (const args of [
        ["webhooks", "list"],
        ["webhooks", "show", hookId],
        ["webhooks", "deliveries", hookId],
        ["webhooks", "test", hookId],
        [
          "webhooks",
          "create",
          "--url",
          "https://hooks.example.com/shop",
          "--events",
          "all",
        ],
      ]) {
        assert.include(
          yield* session.refused([...args, "--workspace", "shop"]),
          "Peal refused: your role in this workspace does not allow it"
        );
      }

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("creates an endpoint, and shows its secret once", () =>
    Effect.gen(function* creates() {
      const session = yield* signedIn();

      const created = yield* session.printed(
        create(
          "--url",
          "https://hooks.example.com/new",
          "--events",
          "post.published,media.ready",
          "--description",
          "Synthetic automation"
        )
      );

      assert.include(
        created,
        `Created webhook endpoint ${newHookId} in Studio: Peal sends post.published, media.ready to https://hooks.example.com/new.`
      );
      assert.include(created, `Signing secret: ${firstSecret}`);
      assert.include(created, "shown this once");

      const shown = yield* session.printed([
        "webhooks",
        "show",
        newHookId,
        ...inStudio,
      ]);

      assert.match(shown, /Address\s+https:\/\/hooks\.example\.com\/new/u);
      assert.match(shown, /Status\s+on/u);
      assert.match(shown, /Events\s+post\.published, media\.ready/u);
      assert.match(shown, /Description\s+Synthetic automation/u);
      assert.notInclude(shown, "whsec_");
      assert.notInclude(
        yield* session.printed(["webhooks", "list", ...inStudio]),
        "whsec_"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        "webhook:create:https://hooks.example.com/new",
        `webhook:secret:${newHookId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("creates one for every event, turned off when asked", () =>
    Effect.gen(function* createsOff() {
      const session = yield* signedIn();

      const created = yield* session.printed(
        create(
          "--url",
          "https://hooks.example.com/everything",
          "--events",
          "all",
          "--disabled"
        )
      );

      assert.include(created, "It is off: Peal sends it nothing until");

      const shown = yield* session.printed([
        "webhooks",
        "show",
        newHookId,
        ...inStudio,
      ]);

      assert.match(shown, /Status\s+off: turned off by a member/u);
      assert.match(shown, /Events\s+all events/u);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses an event type Peal does not send, before asking", () =>
    Effect.gen(function* unknownEvent() {
      const session = yield* signedIn();

      for (const events of ["post.published,post.liked", "webhook.test", ""]) {
        const refused = yield* session.refused(
          create("--url", "https://hooks.example.com/new", "--events", events)
        );

        assert.include(refused, "--events takes");
        assert.include(refused, "post.published");
        assert.include(refused, "channel.reconnect_needed");
      }

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains an address Peal does not deliver to", () =>
    Effect.gen(function* refusedUrl() {
      const session = yield* signedIn();

      for (const [url, reason] of [
        ["http://hooks.example.com/new", "must be HTTPS, on the default port"],
        ["https://hooks.example.com:8443/new", "must be HTTPS"],
        [
          "https://user:secret@hooks.example.com/new",
          "user name or a password",
        ],
        ["hooks.example.com/new", "is not a URL"],
        ["https://localhost/new", "not a public address"],
        ["https://hooks.example.invalid/new", "does not resolve"],
      ] as const) {
        assert.include(
          yield* session.refused(create("--url", url, "--events", "all")),
          reason
        );
      }

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains the limit on endpoints, and a server without keys", () =>
    Effect.gen(function* limits() {
      const session = yield* signedIn();

      const add = create(
        "--url",
        "https://hooks.example.com/new",
        "--events",
        "all"
      );

      yield* Ref.update(session.studio.state, (current) => ({
        ...current,
        signingKeys: false,
      }));

      const unconfigured = yield* session.refused(add);

      assert.include(unconfigured, "PEAL_TOKEN_KEYS");
      assert.include(unconfigured, "operator");
      assert.include(
        yield* session.refused([
          "webhooks",
          "rotate-secret",
          hookId,
          ...inStudio,
        ]),
        "PEAL_TOKEN_KEYS"
      );

      const [first] = webhooks;

      assert.isDefined(first);

      yield* Ref.update(session.studio.state, (current) => ({
        ...current,
        webhooks: Array.from({ length: maxWebhookEndpoints }, (_, index) => ({
          ...first,
          id: `0190f3a0-0000-7000-8000-00000000b1${String(index).padStart(2, "0")}`,
        })),
      }));

      assert.include(
        yield* session.refused(add),
        "The workspace has 10 webhook endpoints, the most it may, whatever its plan: delete one first"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("changes only what it is given", () =>
    Effect.gen(function* updates() {
      const session = yield* signedIn();

      const updated = yield* session.printed([
        "webhooks",
        "update",
        hookId,
        "--description",
        "Renamed",
        "--events",
        "media.failed",
        ...inStudio,
      ]);

      assert.include(updated, `Updated webhook endpoint ${hookId} of Studio.`);
      assert.match(updated, /Description\s+Renamed/u);
      assert.match(updated, /Events\s+media\.failed/u);
      assert.match(updated, /Address\s+https:\/\/hooks\.example\.com\/peal/u);

      assert.match(
        yield* session.printed([
          "webhooks",
          "update",
          hookId,
          "--disable",
          ...inStudio,
        ]),
        /Status\s+off: turned off by a member/u
      );
      assert.match(
        yield* session.printed([
          "webhooks",
          "update",
          failingHookId,
          "--enable",
          "--url",
          "https://hooks.example.com/fixed",
          ...inStudio,
        ]),
        /Status\s+on\n/u
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `webhook:update:${hookId}:description,eventTypes`,
        `webhook:update:${hookId}:enabled`,
        `webhook:update:${failingHookId}:enabled,url`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses an update that changes nothing, or both ways", () =>
    Effect.gen(function* emptyUpdate() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused(["webhooks", "update", hookId, ...inStudio]),
        "Nothing to change"
      );
      assert.include(
        yield* session.refused([
          "webhooks",
          "update",
          hookId,
          "--enable",
          "--disable",
          ...inStudio,
        ]),
        "--enable or --disable, not both"
      );
      assert.include(
        yield* session.refused([
          "webhooks",
          "update",
          "0190f3a0-0000-7000-8000-00000000b999",
          "--disable",
          ...inStudio,
        ]),
        "The workspace has no webhook endpoint with that id"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("rotates a secret, and says how long the old one signs", () =>
    Effect.gen(function* rotates() {
      const session = yield* signedIn();

      const rotated = yield* session.printed([
        "webhooks",
        "rotate-secret",
        hookId,
        ...inStudio,
      ]);

      assert.include(rotated, `Signing secret: ${firstSecret}`);
      assert.include(rotated, "shown this once");
      assert.include(
        rotated,
        "The secret it had still signs deliveries for 24 hours, until 2026-11-10T12:00:00Z"
      );
      assert.match(
        yield* session.printed(["webhooks", "show", hookId, ...inStudio]),
        /Previous secret\s+signs until 2026-11-10T12:00:00Z/u
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `webhook:secret:${hookId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists an endpoint's deliveries, newest first, by page", () =>
    Effect.gen(function* deliveries() {
      const session = yield* signedIn();

      const listed = yield* session.printed([
        "webhooks",
        "deliveries",
        hookId,
        ...inStudio,
      ]);

      assert.include(listed, `Deliveries to endpoint ${hookId}, newest first:`);
      assert.match(
        listed,
        new RegExp(
          `${pendingDeliveryId}\\s+post\\.failed\\s+pending\\s+2 attempts\\s+HTTP 500\\s+187 ms\\s+next attempt 2026-11-09T12:05:05Z`,
          "u"
        )
      );
      assert.match(
        listed,
        new RegExp(
          `${deliveredId}\\s+post\\.published\\s+succeeded\\s+1 attempt\\s+HTTP 204\\s+42 ms`,
          "u"
        )
      );
      assert.match(
        listed,
        new RegExp(
          `${exhaustedDeliveryId}\\s+post\\.published\\s+failed: every attempt failed\\s+8 attempts\\s+no answer in time\\s+15000 ms`,
          "u"
        )
      );
      assert.isBelow(
        listed.indexOf(pendingDeliveryId),
        listed.indexOf(exhaustedDeliveryId)
      );

      const page = yield* session.printed([
        "webhooks",
        "deliveries",
        hookId,
        "--limit",
        "1",
        ...inStudio,
      ]);

      assert.notInclude(page, deliveredId);
      assert.include(
        page,
        `More: peal webhooks deliveries ${hookId} --workspace studio --cursor ${pendingDeliveryId}`
      );
      assert.include(
        yield* session.printed([
          "webhooks",
          "deliveries",
          hookId,
          "--cursor",
          pendingDeliveryId,
          ...inStudio,
        ]),
        deliveredId
      );
      assert.include(
        yield* session.printed([
          "webhooks",
          "deliveries",
          failingHookId,
          ...inStudio,
        ]),
        "has no deliveries"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("sends a test event, and a delivery again", () =>
    Effect.gen(function* sends() {
      const session = yield* signedIn();

      const tested = yield* session.printed([
        "webhooks",
        "test",
        hookId,
        ...inStudio,
      ]);

      assert.include(
        tested,
        `Sent a webhook.test event to endpoint ${hookId}: delivery 0190f3a0-0000-7000-8000-00000000f004 is pending.`
      );
      assert.include(
        tested,
        `peal webhooks deliveries ${hookId} --workspace studio`
      );

      const again = yield* session.printed([
        "webhooks",
        "redeliver",
        "--endpoint",
        hookId,
        exhaustedDeliveryId,
        ...inStudio,
      ]);

      assert.include(
        again,
        `Sending the post.published event of delivery ${exhaustedDeliveryId} to endpoint ${hookId} again: delivery 0190f3a0-0000-7000-8000-00000000f005 is pending.`
      );
      assert.include(
        yield* session.refused([
          "webhooks",
          "redeliver",
          "--endpoint",
          hookId,
          "0190f3a0-0000-7000-8000-00000000f999",
          ...inStudio,
        ]),
        "The endpoint has no delivery with that id"
      );
      assert.include(
        yield* session.refused([
          "webhooks",
          "test",
          failingHookId,
          ...inStudio,
        ]),
        "The endpoint is off"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `webhook:test:${hookId}`,
        `webhook:redeliver:${exhaustedDeliveryId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("deletes an endpoint", () =>
    Effect.gen(function* deletes() {
      const session = yield* signedIn();

      assert.include(
        yield* session.printed(["webhooks", "delete", hookId, ...inStudio]),
        `Deleted webhook endpoint ${hookId} of Studio, with its secret and its delivery log: nothing more is sent to it.`
      );
      assert.include(
        yield* session.refused(["webhooks", "show", hookId, ...inStudio]),
        "The workspace has no webhook endpoint with that id"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `webhook:delete:${hookId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("narrows an endpoint to channels, and clears it", () =>
    Effect.gen(function* filters() {
      const session = yield* signedIn();
      const channel = "0190f3a0-0000-7000-8000-00000000d001";

      const created = yield* session.printed(
        create(
          "--url",
          "https://hooks.example.com/new",
          "--events",
          "post.published",
          "--channel",
          channel,
          "--json"
        )
      );

      assert.match(
        created,
        new RegExp(`"channelIds": \\[\\s+"${channel}"\\s+\\]`, "u")
      );

      const shown = yield* session.printed([
        "webhooks",
        "update",
        hookId,
        "--channel",
        channel,
        ...inStudio,
      ]);

      assert.include(shown, `Channels`);
      assert.include(shown, channel);

      const cleared = yield* session.printed([
        "webhooks",
        "update",
        hookId,
        "--clear-channels",
        ...inStudio,
      ]);

      assert.include(cleared, "every channel");
      assert.include(
        yield* session.refused(
          create(
            "--url",
            "https://hooks.example.com/partner",
            "--events",
            "post.published",
            "--workspace-id",
            "8e3f9a97-8a3c-4dab-8d85-6c4f5a7b8293"
          )
        ),
        "give --partner too"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists the deliveries of every endpoint, by status", () =>
    Effect.gen(function* acrossEndpoints() {
      const session = yield* signedIn();

      const failed = yield* session.printed([
        "webhooks",
        "deliveries",
        "--status",
        "failed",
        ...inStudio,
      ]);

      assert.include(failed, "Deliveries of Studio's endpoints, newest first:");
      assert.match(
        failed,
        new RegExp(
          `${exhaustedDeliveryId}\\s+to ${hookId}\\s+post\\.published`,
          "u"
        )
      );
      assert.notInclude(failed, pendingDeliveryId);
      assert.include(
        yield* session.refused([
          "webhooks",
          "deliveries",
          "--since",
          "yesterday",
          ...inStudio,
        ]),
        "--since takes an instant"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("sends an endpoint's failed deliveries again, and a sample", () =>
    Effect.gen(function* replays() {
      const session = yield* signedIn();

      const again = yield* session.printed([
        "webhooks",
        "redeliver",
        "--failed",
        "--endpoint",
        hookId,
        ...inStudio,
      ]);

      assert.include(
        again,
        "Sending 1 delivery again, as new deliveries of the same events."
      );

      const named = yield* session.printed([
        "webhooks",
        "redeliver",
        exhaustedDeliveryId,
        "0190f3a0-0000-7000-8000-00000000f999",
        ...inStudio,
      ]);

      assert.include(
        named,
        "Skipped 0190f3a0-0000-7000-8000-00000000f999: not a delivery of this workspace."
      );
      assert.include(
        yield* session.refused([
          "webhooks",
          "redeliver",
          "--failed",
          ...inStudio,
        ]),
        "give --endpoint too"
      );

      const sample = yield* session.printed([
        "webhooks",
        "test",
        hookId,
        "--event",
        "post.published",
        ...inStudio,
      ]);

      assert.include(sample, "Sent a sample post.published event");
      assert.deepStrictEqual(yield* changes(session.studio), [
        `webhook:redeliver-many:${exhaustedDeliveryId}`,
        `webhook:redeliver-many:${exhaustedDeliveryId}`,
        `webhook:test:${hookId}:post.published`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
