import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Option, Redacted, Schema } from "effect";
import { TestClock } from "effect/testing";
import { WebhookPayloadSchema } from "peal-contract";

import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { actorIn, freshWorkspace } from "#test/channels/support.ts";
import { FakeTransport } from "#test/webhooks/fakes/fake-transport.ts";
import { StartedJobs } from "#test/webhooks/fakes/started-jobs.ts";
import {
  freshEndpoint,
  freshOwner,
  memberOf,
  receiver,
  referenceSignature,
  WebhooksTest,
} from "#test/webhooks/support.ts";
import { DeliverWebhook } from "#webhooks/application/deliver-webhook.ts";
import { EndpointSecrets } from "#webhooks/application/ports/endpoint-secrets.ts";
import { EndpointStore } from "#webhooks/application/ports/endpoint-store.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import {
  manualSendsPerHour,
  maxEndpointsPerWorkspace,
} from "#webhooks/domain/delivery-policy.ts";
import { changeEndpoint } from "#webhooks/domain/webhook-endpoint.ts";
import { WebhookUrlSchema } from "#webhooks/domain/webhook-url.ts";

const decodePayload = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.toCodecJson(WebhookPayloadSchema))
);

const tagOf = <E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<unknown, E, R>
): Effect.Effect<string, never, R> =>
  effect.pipe(
    Effect.match({
      onFailure: (failure) => failure._tag,
      onSuccess: () => "succeeded",
    })
  );

layer(WebhooksTest)("webhook endpoints", (it) => {
  it.effect("are created with a secret shown once, and stored encrypted", () =>
    Effect.gen(function* creates() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;

      const { endpoint, secret } = yield* endpoints.create(
        owner,
        receiver("hooks.example.com", {
          eventTypes: ["media.ready", "post.failed", "media.ready"],
        })
      );

      const stored = yield* EndpointStore.use((store) =>
        store.secrets(endpoint.id)
      );

      assert.match(Redacted.value(secret), /^whsec_[A-Za-z0-9+/]{43}=$/u);
      assert.strictEqual(endpoint.url, "https://hooks.example.com/hooks");
      assert.deepStrictEqual(endpoint.eventTypes, [
        "post.failed",
        "media.ready",
      ]);
      assert.deepStrictEqual(endpoint.status, { _tag: "enabled" });
      assert.deepStrictEqual(yield* endpoints.list(owner), [endpoint]);
      assert.deepStrictEqual(
        yield* endpoints.get(owner, endpoint.id),
        endpoint
      );
      // Encrypted: nothing of the secret shows in what is stored.
      assert.notInclude(
        Option.getOrThrow(stored).current,
        Redacted.value(secret).slice("whsec_".length)
      );
    })
  );

  it.effect("are read with webhook:read and changed with webhook:manage", () =>
    Effect.gen(function* permissions() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const { endpoint } = yield* freshEndpoint(owner);
      const admin = memberOf(owner.workspaceId, "admin");
      const editor = memberOf(owner.workspaceId, "editor");

      // An OAuth client the owner let read only keeps the reading half.
      const readOnly = actorIn(
        owner.workspaceId,
        owner.permissions.filter((permission) => permission.endsWith(":read"))
      );

      assert.lengthOf(yield* endpoints.list(admin), 1);
      assert.lengthOf(yield* endpoints.list(readOnly), 1);
      assert.strictEqual(
        yield* tagOf(endpoints.list(editor)),
        "MissingPermission"
      );

      const refusals = yield* Effect.all([
        tagOf(endpoints.create(readOnly, receiver("hooks.example.com"))),
        tagOf(endpoints.update(readOnly, endpoint.id, { enabled: false })),
        tagOf(endpoints.remove(readOnly, endpoint.id)),
        tagOf(endpoints.rotateSecret(readOnly, endpoint.id)),
        tagOf(endpoints.sendTest(readOnly, endpoint.id)),
      ]);

      assert.deepStrictEqual(
        refusals,
        refusals.map(() => "MissingPermission")
      );

      assert.lengthOf(yield* endpoints.list(owner), 1);
    })
  );

  it.effect("are found in their own workspace only", () =>
    Effect.gen(function* isolated() {
      const owner = yield* freshOwner;
      const stranger = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const { endpoint } = yield* freshEndpoint(owner);

      const refusals = yield* Effect.all([
        tagOf(endpoints.get(stranger, endpoint.id)),
        tagOf(
          endpoints.update(stranger, endpoint.id, { description: "Taken" })
        ),
        tagOf(endpoints.remove(stranger, endpoint.id)),
        tagOf(endpoints.rotateSecret(stranger, endpoint.id)),
        tagOf(endpoints.sendTest(stranger, endpoint.id)),
        tagOf(endpoints.get(owner, "not-an-id")),
      ]);

      assert.deepStrictEqual(
        refusals,
        refusals.map(() => "EndpointNotFound")
      );

      assert.deepStrictEqual(
        yield* endpoints.get(owner, endpoint.id),
        endpoint
      );
    })
  );

  it.effect("refuse an address Peal does not deliver to, saving nothing", () =>
    Effect.gen(function* refusesUrls() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;

      const refusal = (url: string) =>
        endpoints.create(owner, { ...receiver("hooks.example.com"), url }).pipe(
          Effect.match({
            onFailure: (failure) =>
              "reason" in failure ? failure.reason : failure._tag,
            onSuccess: () => "created",
          })
        );

      assert.strictEqual(
        yield* refusal("http://hooks.example.com/a"),
        "notHttps"
      );
      assert.strictEqual(
        yield* refusal("https://hooks.example.com:8443/a"),
        "notHttps"
      );
      assert.strictEqual(
        yield* refusal("https://user:synthetic@hooks.example.com/a"),
        "credentials"
      );
      assert.strictEqual(yield* refusal("hooks"), "malformed");
      assert.strictEqual(
        yield* refusal("https://service.internal.example/a"),
        "notPublic"
      );
      assert.strictEqual(
        yield* refusal("https://typo.invalid/a"),
        "unknownHost"
      );
      assert.lengthOf(yield* endpoints.list(owner), 0);

      const { endpoint } = yield* freshEndpoint(owner);

      assert.strictEqual(
        yield* tagOf(
          endpoints.update(owner, endpoint.id, {
            url: "https://service.internal.example/a",
          })
        ),
        "UrlNotDeliverable"
      );
      assert.strictEqual(
        (yield* endpoints.get(owner, endpoint.id)).url,
        endpoint.url
      );
    })
  );

  it.effect("are ten a workspace at most, whatever is added at once", () =>
    Effect.gen(function* limited() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;

      const added = yield* Effect.forEach(
        Array.from(
          { length: maxEndpointsPerWorkspace + 3 },
          (_, index) => index
        ),
        (index) =>
          tagOf(endpoints.create(owner, receiver(`r${index}.example.com`))),
        { concurrency: "unbounded" }
      );

      assert.lengthOf(
        added.filter((result) => result === "succeeded"),
        maxEndpointsPerWorkspace
      );
      assert.lengthOf(
        added.filter((result) => result === "TooManyEndpoints"),
        3
      );
      assert.lengthOf(yield* endpoints.list(owner), maxEndpointsPerWorkspace);

      // Another workspace has its own ten.
      const other = yield* freshOwner;

      assert.strictEqual(
        yield* tagOf(endpoints.create(other, receiver("hooks.example.com"))),
        "succeeded"
      );
    })
  );

  it.effect("change only what is named, and are turned off and on", () =>
    Effect.gen(function* updates() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const { endpoint } = yield* freshEndpoint(owner);

      yield* TestClock.adjust("1 hour");

      const renamed = yield* endpoints.update(owner, endpoint.id, {
        description: "Renamed",
      });

      assert.strictEqual(renamed.description, "Renamed");
      assert.strictEqual(renamed.url, endpoint.url);
      assert.deepStrictEqual(renamed.eventTypes, endpoint.eventTypes);
      assert.deepStrictEqual(yield* endpoints.get(owner, endpoint.id), renamed);

      const off = yield* endpoints.update(owner, endpoint.id, {
        enabled: false,
      });

      assert.deepStrictEqual(off.status, {
        _tag: "disabled",
        at: yield* DateTime.now,
        reason: "manual",
      });
      assert.deepStrictEqual(yield* endpoints.get(owner, endpoint.id), off);
      assert.strictEqual(
        yield* tagOf(endpoints.sendTest(owner, endpoint.id)),
        "EndpointDisabled"
      );

      const on = yield* endpoints.update(owner, endpoint.id, {
        enabled: true,
        eventTypes: ["channel.connected"],
        url: "https://other.example.com/hooks",
      });

      assert.deepStrictEqual(on.status, { _tag: "enabled" });
      assert.deepStrictEqual(on.eventTypes, ["channel.connected"]);
      assert.deepStrictEqual(yield* endpoints.get(owner, endpoint.id), on);
    })
  );

  it.effect(
    "stay off when a change read before Peal turned one off is saved after",
    () =>
      Effect.gen(function* raced() {
        const owner = yield* freshOwner;
        const store = yield* EndpointStore;
        const { endpoint } = yield* freshEndpoint(owner);
        const now = yield* DateTime.now;

        // A member's change of the description, read while it was on...
        const described = changeEndpoint(
          endpoint,
          { description: "Renamed meanwhile" },
          now
        );

        // ...and saved after its deliveries failed for good.
        yield* store.markFailing(endpoint.id, now);
        assert.isTrue(yield* store.disable(endpoint.id, "failing", now));
        assert.isTrue(yield* store.update(described, endpoint, Option.none()));

        const kept = Option.getOrThrow(yield* store.get(endpoint.id));

        assert.strictEqual(kept.description, "Renamed meanwhile");
        assert.strictEqual(kept.status._tag, "disabled");
        assert.isTrue(Option.isSome(kept.failingSince));

        // Turned on by a member, it is on, and its failures forgotten.
        const turnedOn = changeEndpoint(kept, { enabled: true }, now);

        assert.isTrue(yield* store.update(turnedOn, kept, Option.none()));

        const on = Option.getOrThrow(yield* store.get(endpoint.id));

        assert.strictEqual(on.status._tag, "enabled");
        assert.isTrue(Option.isNone(on.failingSince));
      })
  );

  it.effect("are deleted with their secrets", () =>
    Effect.gen(function* removes() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const { endpoint } = yield* freshEndpoint(owner);

      yield* endpoints.remove(owner, endpoint.id);

      const stored = yield* EndpointStore.use((store) =>
        store.secrets(endpoint.id)
      );

      assert.isTrue(Option.isNone(stored));
      assert.lengthOf(yield* endpoints.list(owner), 0);
      assert.strictEqual(
        yield* tagOf(endpoints.remove(owner, endpoint.id)),
        "EndpointNotFound"
      );
    })
  );

  it.effect(
    "sign with the secret before a rotation for a day, beside the new one",
    () =>
      Effect.gen(function* rotates() {
        const owner = yield* freshOwner;
        const endpoints = yield* WebhookEndpoints;
        const transport = yield* FakeTransport;
        const delivering = yield* DeliverWebhook;
        const first = yield* freshEndpoint(owner);
        const { id } = first.endpoint;

        const second = yield* endpoints.rotateSecret(owner, id);

        assert.notStrictEqual(
          Redacted.value(second.secret),
          Redacted.value(first.secret)
        );
        assert.isTrue(Option.isSome(second.endpoint.previousSecretExpiresAt));
        assert.deepStrictEqual(
          yield* endpoints.get(owner, id),
          second.endpoint
        );

        // During the overlap: both signatures, the new secret's first.
        yield* TestClock.adjust("23 hours");

        const during = yield* endpoints.sendTest(owner, id);

        yield* delivering.attempt(during.id, 1);

        // Once it is over: the new secret alone.
        yield* TestClock.adjust("1 hour");

        const after = yield* endpoints.sendTest(owner, id);

        yield* delivering.attempt(after.id, 1);

        const [overlapping, alone] = yield* transport.sentTo(first.host);

        assert(overlapping !== undefined && alone !== undefined);
        assert.strictEqual(
          overlapping.headers["webhook-signature"],
          `${referenceSignature(second.secret, overlapping)} ${referenceSignature(first.secret, overlapping)}`
        );
        assert.strictEqual(
          alone.headers["webhook-signature"],
          referenceSignature(second.secret, alone)
        );
      })
  );

  it.effect("send a test event to an endpoint, whatever it subscribes to", () =>
    Effect.gen(function* tests() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const transport = yield* FakeTransport;
      const { endpoint, host } = yield* freshEndpoint(owner);
      const bystander = yield* freshEndpoint(owner);

      const delivery = yield* endpoints.sendTest(owner, endpoint.id);
      const started = yield* StartedJobs.use((jobs) => jobs.deliveries);

      assert.strictEqual(delivery.eventType, "webhook.test");
      assert.deepStrictEqual(delivery.status._tag, "pending");
      assert.include(started, delivery.id);

      yield* DeliverWebhook.use((delivering) =>
        delivering.attempt(delivery.id, 1)
      );

      const [request] = yield* transport.sentTo(host);

      assert(request !== undefined);
      assert.deepStrictEqual(JSON.parse(request.body), {
        data: { endpointId: endpoint.id, workspaceId: owner.workspaceId },
        id: delivery.eventId,
        timestamp: DateTime.formatIso(yield* DateTime.now),
        type: "webhook.test",
        version: 1,
        workspaceExternalId: null,
      });
      assert.lengthOf(yield* transport.sentTo(bystander.host), 0);
    })
  );

  it.effect(
    "are sent so many test events and deliveries again an hour, a workspace",
    () =>
      Effect.gen(function* capped() {
        const owner = yield* freshOwner;
        const other = yield* freshOwner;
        const endpoints = yield* WebhookEndpoints;
        const deliveries = yield* WebhookDeliveries;
        const { endpoint } = yield* freshEndpoint(owner);
        const theirs = yield* freshEndpoint(other);

        const first = yield* endpoints.sendTest(owner, endpoint.id);

        yield* Effect.forEach(
          Array.from({ length: manualSendsPerHour - 1 }),
          () => deliveries.redeliver(owner, endpoint.id, first.id),
          { discard: true }
        );

        // The hour's sends are spent, by tests and resends together.
        assert.deepStrictEqual(
          yield* Effect.all([
            tagOf(endpoints.sendTest(owner, endpoint.id)),
            tagOf(deliveries.redeliver(owner, endpoint.id, first.id)),
          ]),
          ["TooManyManualSends", "TooManyManualSends"]
        );

        // Another workspace has its own, and the hour gives them back.
        yield* endpoints.sendTest(other, theirs.endpoint.id);
        yield* TestClock.adjust("61 minutes");
        yield* endpoints.sendTest(owner, endpoint.id);
      })
  );

  it.effect("belong to no workspace but their own in a list", () =>
    Effect.gen(function* lists() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const first = yield* freshEndpoint(owner);
      const second = yield* freshEndpoint(owner);

      yield* freshEndpoint(yield* freshOwner);

      assert.deepStrictEqual(
        (yield* endpoints.list(owner)).map(({ id }) => id),
        [first.endpoint.id, second.endpoint.id]
      );
      assert.lengthOf(
        yield* endpoints.list(memberOf(yield* freshWorkspace, "owner")),
        0
      );
    })
  );

  it.effect("send a sample of a type, whatever the endpoint filters", () =>
    Effect.gen(function* samples() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const transport = yield* FakeTransport;

      // It hears neither the type nor the sample's channel.
      const { endpoint, host } = yield* freshEndpoint(owner, {
        channelIds: ["01900000-0000-7000-8000-0000000000f1"],
        eventTypes: ["media.ready"],
      });

      const delivery = yield* endpoints.sendTest(
        owner,
        endpoint.id,
        "post.published"
      );

      yield* DeliverWebhook.use((delivering) =>
        delivering.attempt(delivery.id, 1)
      );

      const [request] = yield* transport.sentTo(host);

      assert(request !== undefined);

      // A payload of the public contract, marked as a sample.
      const body = decodePayload(request.body);

      assert.strictEqual(delivery.eventType, "post.published");
      assert.strictEqual(body.type, "post.published");
      assert.strictEqual(body.sample, true);
      assert.strictEqual(body.data.workspaceId, owner.workspaceId);
      assert.strictEqual(
        "postId" in body.data ? body.data.postId : undefined,
        "00000000-0000-7000-8000-000000000001"
      );
    })
  );

  it.effect("keep their filters as saved, each id once", () =>
    Effect.gen(function* filters() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;

      const channel = ChannelIdSchema.make(
        "01900000-0000-7000-8000-0000000000f2"
      );

      const { endpoint } = yield* freshEndpoint(owner, {
        channelIds: [channel, channel],
      });

      assert.deepStrictEqual(endpoint.channelIds, [channel]);
      assert.deepStrictEqual(
        (yield* endpoints.get(owner, endpoint.id)).channelIds,
        [channel]
      );

      const kept = yield* endpoints.update(owner, endpoint.id, {
        description: "Renamed",
      });

      assert.deepStrictEqual(kept.channelIds, [channel]);

      const cleared = yield* endpoints.update(owner, endpoint.id, {
        channelIds: [],
      });

      assert.deepStrictEqual(cleared.channelIds, []);
    })
  );

  it.effect("take a list of workspaces on a partner endpoint only", () =>
    Effect.gen(function* workspaceFilter() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const tenant = "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f";

      assert.strictEqual(
        yield* tagOf(
          endpoints.create(
            owner,
            receiver("refused.hooks.example.com", { workspaceIds: [tenant] })
          )
        ),
        "FilterRefused"
      );

      const { endpoint } = yield* freshEndpoint(owner);

      assert.strictEqual(
        yield* tagOf(
          endpoints.update(owner, endpoint.id, { workspaceIds: [tenant] })
        ),
        "FilterRefused"
      );
      assert.strictEqual(
        yield* tagOf(
          endpoints.update(owner, endpoint.id, { channelIds: ["not an id"] })
        ),
        "FilterRefused"
      );
      // An empty list asks for nothing.
      assert.deepStrictEqual(
        (yield* endpoints.update(owner, endpoint.id, { workspaceIds: [] }))
          .workspaceIds,
        []
      );
      assert.lengthOf(yield* endpoints.list(owner), 1);
    })
  );

  it.effect(
    "keep their headers sealed and show their names only, the whole list replaced by a change",
    () =>
      Effect.gen(function* headers() {
        const owner = yield* freshOwner;
        const endpoints = yield* WebhookEndpoints;
        const store = yield* EndpointStore;
        const value = "Bearer synthetic-header-value";

        const { endpoint } = yield* freshEndpoint(owner, {
          headers: [{ name: "Authorization", value }],
        });

        assert.deepStrictEqual(endpoint.headerNames, ["Authorization"]);
        assert.deepStrictEqual(
          (yield* endpoints.get(owner, endpoint.id)).headerNames,
          ["Authorization"]
        );

        const [sealed] = Option.getOrThrow(
          yield* store.secrets(endpoint.id)
        ).headers;

        assert(sealed !== undefined);
        assert.strictEqual(sealed.name, "Authorization");
        assert.notInclude(sealed.sealed, "synthetic-header-value");

        // Left out, they stay; given, they replace; empty, they go.
        const described = yield* endpoints.update(owner, endpoint.id, {
          description: "Renamed",
        });

        assert.deepStrictEqual(described.headerNames, ["Authorization"]);

        const replaced = yield* endpoints.update(owner, endpoint.id, {
          headers: [
            { name: "X-Gateway-Key", value: "synthetic-key" },
            { name: "X-Route", value: "synthetic-route" },
          ],
        });

        assert.deepStrictEqual(replaced.headerNames, [
          "X-Gateway-Key",
          "X-Route",
        ]);
        assert.lengthOf(
          Option.getOrThrow(yield* store.secrets(endpoint.id)).headers,
          2
        );

        // Named alone, whatever its case, a header keeps its value.
        const kept = yield* endpoints.update(owner, endpoint.id, {
          headers: [
            { name: "x-gateway-key" },
            { name: "X-Other", value: "synthetic-other" },
          ],
        });

        const before = Option.getOrThrow(yield* store.secrets(endpoint.id));

        assert.deepStrictEqual(kept.headerNames, ["x-gateway-key", "X-Other"]);
        assert.strictEqual(
          yield* tagOf(
            endpoints.update(owner, endpoint.id, {
              headers: [{ name: "X-Unknown" }],
            })
          ),
          "HeadersRefused"
        );
        assert.deepStrictEqual(
          Option.getOrThrow(yield* store.secrets(endpoint.id)).headers,
          before.headers
        );

        const opened = yield* EndpointSecrets.use((secrets) =>
          secrets.openHeaders(endpoint.id, endpoint.url, before.headers)
        );

        assert.deepStrictEqual(
          opened.map((header) => [header.name, Redacted.value(header.value)]),
          [
            ["x-gateway-key", "synthetic-key"],
            ["X-Other", "synthetic-other"],
          ]
        );

        const cleared = yield* endpoints.update(owner, endpoint.id, {
          headers: [],
        });

        assert.deepStrictEqual(cleared.headerNames, []);
      })
  );

  it.effect(
    "never carry a header's value to another origin unless it is given again",
    () =>
      Effect.gen(function* origins() {
        const owner = yield* freshOwner;
        const endpoints = yield* WebhookEndpoints;
        const store = yield* EndpointStore;
        const transport = yield* FakeTransport;
        const value = "Bearer synthetic-gateway-token";

        const { endpoint, host } = yield* freshEndpoint(owner, {
          headers: [{ name: "Authorization", value }],
        });

        const stranger = `${crypto.randomUUID()}.hooks.example.com`;
        const before = Option.getOrThrow(yield* store.secrets(endpoint.id));

        // Another host, with the headers kept or named without a value:
        // refused, nothing saved.
        assert.deepStrictEqual(
          yield* Effect.all([
            tagOf(
              endpoints.update(owner, endpoint.id, {
                url: `https://${stranger}/x`,
              })
            ),
            tagOf(
              endpoints.update(owner, endpoint.id, {
                headers: [{ name: "Authorization" }],
                url: `https://${stranger}/x`,
              })
            ),
          ]),
          ["HeaderValuesRequired", "HeaderValuesRequired"]
        );
        assert.strictEqual(
          (yield* endpoints.get(owner, endpoint.id)).url,
          endpoint.url
        );
        assert.deepStrictEqual(
          Option.getOrThrow(yield* store.secrets(endpoint.id)).headers,
          before.headers
        );

        // Another path on the same origin keeps them.
        yield* endpoints.update(owner, endpoint.id, {
          url: `https://${host}/other?synthetic=1`,
        });

        const sameOrigin = yield* endpoints.sendTest(owner, endpoint.id);

        yield* DeliverWebhook.use((delivering) =>
          delivering.attempt(sameOrigin.id, 1)
        );

        assert.deepStrictEqual(
          (yield* transport.sentTo(host)).map(
            (request) => request.headers["Authorization"]
          ),
          [value]
        );

        // Given again with its value, it goes to the new host: that value.
        const moved = yield* endpoints.update(owner, endpoint.id, {
          headers: [{ name: "Authorization", value: "Bearer synthetic-new" }],
          url: `https://${stranger}/x`,
        });

        assert.deepStrictEqual(moved.headerNames, ["Authorization"]);

        const delivery = yield* endpoints.sendTest(owner, endpoint.id);

        yield* DeliverWebhook.use((delivering) =>
          delivering.attempt(delivery.id, 1)
        );

        assert.deepStrictEqual(
          (yield* transport.sentTo(stranger)).map(
            (request) => request.headers["Authorization"]
          ),
          ["Bearer synthetic-new"]
        );

        // Cleared, the endpoint moves anywhere.
        const cleared = yield* endpoints.update(owner, endpoint.id, {
          headers: [],
          url: `https://${host}/hooks`,
        });

        assert.deepStrictEqual(cleared.headerNames, []);
      })
  );

  it.effect("seal a header's value for its endpoint's origin only", () =>
    Effect.gen(function* bound() {
      const owner = yield* freshOwner;
      const secrets = yield* EndpointSecrets;
      const store = yield* EndpointStore;

      const { endpoint, host } = yield* freshEndpoint(owner, {
        headers: [{ name: "Authorization", value: "synthetic-bound" }],
      });

      const { headers } = Option.getOrThrow(yield* store.secrets(endpoint.id));

      const opened = yield* secrets.openHeaders(
        endpoint.id,
        WebhookUrlSchema.make(`https://${host}/elsewhere`),
        headers
      );

      assert.deepStrictEqual(
        opened.map((header) => Redacted.value(header.value)),
        ["synthetic-bound"]
      );
      assert.strictEqual(
        yield* tagOf(
          secrets.openHeaders(
            endpoint.id,
            WebhookUrlSchema.make("https://elsewhere.example.com/hooks"),
            headers
          )
        ),
        "SecretsNotConfigured"
      );
    })
  );

  it.effect("refuse headers an endpoint cannot carry, saving nothing", () =>
    Effect.gen(function* refused() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const before = (yield* endpoints.list(owner)).length;

      for (const headers of [
        [{ name: "webhook-id", value: "synthetic" }],
        [{ name: "Content-Type", value: "text/plain" }],
        [{ name: "X-Value", value: "line\nbreak" }],
        [
          { name: "Authorization", value: "synthetic-one" },
          { name: "authorization", value: "synthetic-two" },
        ],
        ["A", "B", "C", "D", "E", "F"].map((name) => ({
          name,
          value: "synthetic",
        })),
      ]) {
        assert.strictEqual(
          yield* tagOf(
            endpoints.create(owner, receiver("hooks.example.com", { headers }))
          ),
          "HeadersRefused"
        );
      }

      assert.lengthOf(yield* endpoints.list(owner), before);
    })
  );
});
