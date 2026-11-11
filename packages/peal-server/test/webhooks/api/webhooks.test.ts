import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api, maxWebhookEndpoints } from "peal-contract";
import type { Member } from "peal-contract";

import type { WorkspaceId } from "#shared/domain/ids.ts";
import { freshWorkspace, memberOf } from "#test/channels/support.ts";
import {
  answered,
  FakeTransport,
} from "#test/webhooks/fakes/fake-transport.ts";
import { WebhooksTest } from "#test/webhooks/support.ts";
import { WebhooksHandlers } from "#webhooks/api/webhooks.ts";
import { DeliverWebhook } from "#webhooks/application/deliver-webhook.ts";
import { WebhookDeliveryIdSchema } from "#webhooks/domain/webhook-delivery-id.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// A client of the webhooks endpoints whose every request acts as the
// member, as the WorkspaceAccess middleware would hand them to the handlers.
const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["webhooks"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        WebhooksHandlers.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const owner = (workspaceId: WorkspaceId) =>
  memberOf(workspaceId, permissionsFor("owner"));

const editor = (workspaceId: WorkspaceId) =>
  memberOf(workspaceId, permissionsFor("editor"));

// An API key, or an OAuth client, let read webhooks and nothing more.
const reader = (workspaceId: WorkspaceId) =>
  memberOf(workspaceId, ["webhook:read"]);

const tagOf = <E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<unknown, E, R>
): Effect.Effect<string, never, R> =>
  effect.pipe(
    Effect.match({
      onFailure: (failure) => failure._tag,
      onSuccess: () => "succeeded",
    })
  );

const host = () => `${crypto.randomUUID()}.hooks.example.com`;

layer(WebhooksTest)("the webhooks endpoints", (it) => {
  it.effect(
    "create an endpoint with its secret, shown once, then list, change and delete it",
    () =>
      Effect.gen(function* lifecycle() {
        const workspaceId = yield* freshWorkspace;
        const client = yield* clientAs(owner(workspaceId));
        const params = { workspaceId };

        const created = yield* client.webhooks.create({
          params,
          payload: {
            eventTypes: ["post.published", "post.failed"],
            url: `https://${host()}/hooks`,
          },
        });

        const endpointParams = { ...params, endpointId: created.endpoint.id };

        assert.match(created.secret, /^whsec_[A-Za-z0-9+/]{43}=$/u);
        assert.deepStrictEqual(
          {
            description: created.endpoint.description,
            disabledReason: created.endpoint.disabledReason,
            enabled: created.endpoint.enabled,
            eventTypes: created.endpoint.eventTypes,
            failingSince: created.endpoint.failingSince,
          },
          {
            description: "",
            disabledReason: null,
            enabled: true,
            eventTypes: ["post.published", "post.failed"],
            failingSince: null,
          }
        );

        const listed = yield* client.webhooks.list({ params });

        assert.deepStrictEqual(listed, [created.endpoint]);
        // The secret is in that one answer and no other.
        assert.notInclude(JSON.stringify(listed), "whsec_");
        assert.notInclude(
          JSON.stringify(
            yield* client.webhooks.get({ params: endpointParams })
          ),
          "whsec_"
        );

        const off = yield* client.webhooks.update({
          params: endpointParams,
          payload: { description: "Synthetic receiver", enabled: false },
        });

        assert.strictEqual(off.enabled, false);
        assert.strictEqual(off.disabledReason, "manual");
        assert.strictEqual(off.description, "Synthetic receiver");
        assert.strictEqual(off.url, created.endpoint.url);
        assert.strictEqual(
          yield* tagOf(
            client.webhooks.sendTest({ params: endpointParams, query: {} })
          ),
          "WebhookEndpointDisabled"
        );

        const rotated = yield* client.webhooks.rotateSecret({
          params: endpointParams,
        });

        assert.notStrictEqual(rotated.secret, created.secret);
        assert.isNotNull(rotated.endpoint.previousSecretExpiresAt);

        yield* client.webhooks.delete({ params: endpointParams });

        assert.deepStrictEqual(yield* client.webhooks.list({ params }), []);
        assert.strictEqual(
          yield* tagOf(client.webhooks.get({ params: endpointParams })),
          "WebhookEndpointNotFound"
        );
      })
  );

  it.effect("send a test event, log its delivery and send it again", () =>
    Effect.gen(function* deliveries() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* clientAs(owner(workspaceId));
      const transport = yield* FakeTransport;
      const receiver = host();

      const { endpoint } = yield* client.webhooks.create({
        params: { workspaceId },
        payload: {
          eventTypes: ["post.published"],
          url: `https://${receiver}/hooks`,
        },
      });

      const params = { endpointId: endpoint.id, workspaceId };
      const pending = yield* client.webhooks.sendTest({ params, query: {} });

      assert.deepStrictEqual(
        {
          attempts: pending.attempts,
          eventType: pending.eventType,
          status: pending.status,
        },
        { attempts: 0, eventType: "webhook.test", status: "pending" }
      );

      yield* transport.next(receiver, answered(500, "synthetic failure"));
      yield* DeliverWebhook.use((delivering) =>
        delivering.attempt(WebhookDeliveryIdSchema.make(pending.id), 1)
      );

      const [logged] = (yield* client.webhooks.listDeliveries({
        params,
        query: {},
      })).items;

      assert(logged !== undefined);
      assert.deepStrictEqual(
        {
          attempts: logged.attempts,
          durationMs: logged.durationMs,
          error: logged.error,
          failureReason: logged.failureReason,
          id: logged.id,
          responseExcerpt: logged.responseExcerpt,
          responseStatus: logged.responseStatus,
          status: logged.status,
        },
        {
          attempts: 1,
          durationMs: 42,
          error: null,
          failureReason: null,
          id: pending.id,
          responseExcerpt: "synthetic failure",
          responseStatus: 500,
          status: "pending",
        }
      );
      assert.isNotNull(logged.nextAttemptAt);

      const again = yield* client.webhooks.redeliver({
        params: { ...params, deliveryId: pending.id },
      });

      assert.strictEqual(again.eventId, pending.eventId);
      assert.notStrictEqual(again.id, pending.id);

      const page = yield* client.webhooks.listDeliveries({
        params,
        query: { limit: 1 },
      });

      assert.deepStrictEqual(
        page.items.map(({ id }) => id),
        [again.id]
      );
      assert.strictEqual(page.nextCursor, again.id);
      assert.deepStrictEqual(
        (yield* client.webhooks.listDeliveries({
          params,
          query: { cursor: again.id },
        })).items.map(({ id }) => id),
        [pending.id]
      );
      assert.strictEqual(
        yield* tagOf(
          client.webhooks.listDeliveries({
            params,
            query: { cursor: "not-a-cursor" },
          })
        ),
        "BadRequest"
      );
      assert.strictEqual(
        yield* tagOf(
          client.webhooks.redeliver({
            params: { ...params, deliveryId: "not-a-delivery" },
          })
        ),
        "WebhookDeliveryNotFound"
      );
    })
  );

  it.effect(
    "say why an address is refused, and when the workspace has ten",
    () =>
      Effect.gen(function* refusals() {
        const workspaceId = yield* freshWorkspace;
        const client = yield* clientAs(owner(workspaceId));
        const params = { workspaceId };

        const refusal = (url: string) =>
          client.webhooks
            .create({ params, payload: { eventTypes: ["media.ready"], url } })
            .pipe(
              Effect.match({
                onFailure: (failure) =>
                  failure._tag === "WebhookUrlRefused"
                    ? failure.reason
                    : failure._tag,
                onSuccess: () => "created",
              })
            );

        assert.strictEqual(
          yield* refusal("http://hooks.example.com/a"),
          "notHttps"
        );
        assert.strictEqual(
          yield* refusal("https://user:synthetic@hooks.example.com/a"),
          "credentials"
        );
        assert.strictEqual(yield* refusal("not a url"), "malformed");
        assert.strictEqual(
          yield* refusal("https://service.internal.example/a"),
          "notPublic"
        );
        assert.strictEqual(
          yield* refusal("https://typo.invalid/a"),
          "unknownHost"
        );

        for (let count = 0; count < maxWebhookEndpoints; count += 1) {
          assert.strictEqual(yield* refusal(`https://${host()}/a`), "created");
        }

        const full = yield* client.webhooks
          .create({
            params,
            payload: {
              eventTypes: ["media.ready"],
              url: `https://${host()}/a`,
            },
          })
          .pipe(Effect.flip);

        assert(full._tag === "TooManyWebhookEndpoints");
        assert.strictEqual(full.allowed, maxWebhookEndpoints);
      })
  );

  it.effect(
    "follow the permission, for members, API keys and OAuth clients",
    () =>
      Effect.gen(function* permissions() {
        const workspaceId = yield* freshWorkspace;
        const asOwner = yield* clientAs(owner(workspaceId));
        const asReader = yield* clientAs(reader(workspaceId));
        const asEditor = yield* clientAs(editor(workspaceId));
        const params = { workspaceId };

        const { endpoint } = yield* asOwner.webhooks.create({
          params,
          payload: {
            eventTypes: ["post.published"],
            url: `https://${host()}/hooks`,
          },
        });

        const endpointParams = { ...params, endpointId: endpoint.id };

        assert.lengthOf(yield* asReader.webhooks.list({ params }), 1);
        assert.lengthOf(
          (yield* asReader.webhooks.listDeliveries({
            params: endpointParams,
            query: {},
          })).items,
          0
        );

        const refused = yield* Effect.all([
          tagOf(asEditor.webhooks.list({ params })),
          tagOf(asEditor.webhooks.get({ params: endpointParams })),
          tagOf(
            asReader.webhooks.create({
              params,
              payload: {
                eventTypes: ["post.published"],
                url: `https://${host()}/hooks`,
              },
            })
          ),
          tagOf(
            asReader.webhooks.update({
              params: endpointParams,
              payload: { enabled: false },
            })
          ),
          tagOf(asReader.webhooks.delete({ params: endpointParams })),
          tagOf(asReader.webhooks.rotateSecret({ params: endpointParams })),
          tagOf(
            asReader.webhooks.sendTest({ params: endpointParams, query: {} })
          ),
          tagOf(asEditor.webhooks.searchDeliveries({ params, query: {} })),
          tagOf(
            asReader.webhooks.redeliverMany({
              params,
              payload: { endpointId: endpoint.id },
            })
          ),
        ]);

        assert.deepStrictEqual(
          refused,
          refused.map(() => "Forbidden")
        );
      })
  );

  it.effect(
    "list deliveries across endpoints, not as an endpoint named deliveries",
    () =>
      Effect.gen(function* acrossEndpoints() {
        const workspaceId = yield* freshWorkspace;
        const client = yield* clientAs(owner(workspaceId));
        const params = { workspaceId };
        const transport = yield* FakeTransport;
        const receiver = host();

        const { endpoint } = yield* client.webhooks.create({
          params,
          payload: {
            channelIds: ["01900000-0000-7000-8000-0000000000c1"],
            eventTypes: ["post.published"],
            url: `https://${receiver}/hooks`,
          },
        });

        assert.deepStrictEqual(endpoint.channelIds, [
          "01900000-0000-7000-8000-0000000000c1",
        ]);
        assert.deepStrictEqual(endpoint.workspaceIds, []);

        const sample = yield* client.webhooks.sendTest({
          params: { ...params, endpointId: endpoint.id },
          query: { eventType: "post.failed" },
        });

        assert.strictEqual(sample.eventType, "post.failed");
        assert.strictEqual(sample.endpointId, endpoint.id);
        assert.strictEqual(sample.workspaceId, workspaceId);
        assert.isNull(sample.redeliveryOf);

        yield* transport.next(receiver, answered(410));
        yield* DeliverWebhook.use((delivering) =>
          delivering.attempt(WebhookDeliveryIdSchema.make(sample.id), 1)
        );

        const page = yield* client.webhooks.searchDeliveries({
          params,
          query: { status: "failed" },
        });

        assert.deepStrictEqual(
          page.items.map(({ id }) => id),
          [sample.id]
        );

        // The endpoint was turned off by 410 Gone: sending it again skips.
        const again = yield* client.webhooks.redeliverMany({
          params,
          payload: { deliveryIds: [sample.id] },
        });

        assert.deepStrictEqual(again, {
          redelivered: [],
          remaining: 0,
          skipped: [{ deliveryId: sample.id, reason: "endpointDisabled" }],
        });
        assert.strictEqual(
          yield* tagOf(
            client.webhooks.redeliverMany({
              params,
              payload: { endpointId: "not-an-endpoint" },
            })
          ),
          "WebhookEndpointNotFound"
        );
      })
  );

  it.effect("refuse a list of workspaces on an endpoint of its own", () =>
    Effect.gen(function* refused() {
      const workspaceId = yield* freshWorkspace;
      const client = yield* clientAs(owner(workspaceId));
      const params = { workspaceId };

      const { endpoint } = yield* client.webhooks.create({
        params,
        payload: {
          eventTypes: ["post.published"],
          url: `https://${host()}/hooks`,
        },
      });

      assert.strictEqual(
        yield* tagOf(
          client.webhooks.update({
            params: { ...params, endpointId: endpoint.id },
            payload: {
              workspaceIds: ["5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"],
            },
          })
        ),
        "WebhookFilterRefused"
      );
    })
  );
});
