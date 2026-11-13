// What the server writes about a request never holds a credential: a
// connect link's token, a review link's, a partner key, the token of a
// link that applies a request to cancel, the value of a header a webhook
// endpoint's deliveries carry, two-step verification's key, codes and
// recovery codes, the image provider's key, or the key of a provider a
// workspace brought (nor the prompt sent to either). The app runs here as production
// runs it, logging each request and tracing it, and everything a log line
// or a span would export is searched for each secret.
import { once } from "node:events";
import { createServer } from "node:http";

import { assert, layer } from "@effect/vitest";
import {
  Cause,
  ConfigProvider,
  Effect,
  Exit,
  Layer,
  Logger,
  Option,
  References,
  Schema,
  Tracer,
} from "effect";
import { SqlClient } from "effect/sql";
import sharp from "sharp";

import { WritingAssistant } from "#assistant/application/writing-assistant.ts";
import { DrizzleMediaAssetsLive } from "#media/infrastructure/drizzle-media-assets.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import { FacebookOptions } from "#publishing/domain/facebook-options.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { ShortLinks } from "#shortlinks/application/short-links.ts";
import { ShortLinksLive } from "#shortlinks/container.ts";
import {
  actorIn,
  DatabaseTest as AssistantDatabaseTest,
  imagesTest,
} from "#test/assistant/support.ts";
import { DatabaseTest, syntheticKeyring } from "#test/channels/support.ts";
import { storageSettings } from "#test/media/support.ts";
import {
  facebookPageId,
  fakeMetaGraph,
  graphAppSecret,
} from "#test/publishing/fakes/fake-meta-graph.ts";
import {
  attached,
  credentialsOf,
  metaClientWith,
  outgoing,
  testFile,
} from "#test/publishing/platforms/support.ts";
import { liveTarget, OpenLinkStanding } from "#test/shortlinks/support.ts";
import {
  answered,
  FakeTransport,
} from "#test/webhooks/fakes/fake-transport.ts";
import {
  freshEndpoint,
  freshOwner,
  WebhooksTest,
} from "#test/webhooks/support.ts";
import {
  bodyOf,
  MigratedSqlLive,
  password,
  signedUp,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";
import {
  bearer,
  customerOf,
  keyOf,
  partnerOf,
} from "#test/workspace/integration/partner-support.ts";
import {
  codeOf,
  enrolled,
  passwordStep,
  secondStep,
  withCookies,
  wrongCodeOf,
} from "#test/workspace/support.ts";
import { toDeliveryView, toEndpointView } from "#webhooks/api/webhook-view.ts";
import { DeliverWebhook } from "#webhooks/application/deliver-webhook.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const CreatedLinkSchema = Schema.Struct({ url: Schema.String });

const lines: string[] = [];
const spans: Tracer.NativeSpan[] = [];

const tracer = Tracer.make({
  span: (options) => {
    const span = new Tracer.NativeSpan(options);

    spans.push(span);

    return span;
  },
});

// Everything a logger is handed: the message, its cause, and what the
// line is annotated with, as an exporter would write them.
const capture = Logger.layer([
  Logger.make(({ cause, fiber, message }) => {
    lines.push(
      JSON.stringify(message),
      Cause.pretty(cause),
      JSON.stringify(fiber.getRef(References.CurrentLogAnnotations)),
      JSON.stringify(fiber.getRef(References.CurrentLogSpans))
    );
  }),
]);

// Everything a span would export, as text.
const spanText = (span: Tracer.NativeSpan): string =>
  [
    span.name,
    JSON.stringify([...span.attributes]),
    JSON.stringify(span.events),
    span.status._tag === "Ended" && Exit.isFailure(span.status.exit)
      ? Cause.pretty(span.status.exit.cause)
      : "",
  ].join("\n");

const Test = Layer.mergeAll(
  TestApp.layerWith(
    { ...unconfirmedEmails, PEAL_PARTNER_SELF_SERVICE: "true" },
    Layer.merge(capture, Layer.succeed(Tracer.Tracer, tracer))
  ),
  MigratedSqlLive
);

const written = () => [...lines, ...spans.map(spanText)].join("\n");

layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "what the server writes about requests",
  (it) => {
    it.effect(
      "holds no connect link's token, through a whole link's steps, and no key or token of another kind",
      () =>
        Effect.gen(function* searched() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("secrets");
          const { key } = yield* keyOf(owner, home);
          const customer = yield* customerOf(key, "Secrets", "cus_secret_1");

          const created = yield* app.request(
            `/api/workspaces/${customer.id}/connect-links`,
            { body: { platform: "mastodon" }, headers: bearer(key) }
          );

          const { url } = yield* bodyOf(CreatedLinkSchema, created);
          const token = url.slice(url.lastIndexOf("#") + 1);
          const holding = { "x-connect-link-token": token };

          assert.isAbove(token.length, 20);

          // The link's steps, as its page takes them: opened, started,
          // completed and chosen (refused here, as no platform answers).
          const statuses = [
            (yield* app.request("/api/connect-links", { headers: holding }))
              .status,
            (yield* app.request("/api/connect-links/start", {
              body: { instance: "localhost" },
              headers: holding,
            })).status,
            (yield* app.request("/api/connect-links/complete", {
              body: { code: "synthetic-code", state: "synthetic-state" },
              headers: holding,
            })).status,
            (yield* app.request("/api/connect-links/accounts", {
              body: { accountIds: ["synthetic"], selection: "synthetic" },
              headers: holding,
            })).status,
          ];

          assert.deepStrictEqual(statuses, [200, 422, 422, 422]);

          // The other credentials that are no session: a review link's
          // token and the token of a link that applies a request, sent as
          // their pages send them.
          const reviewToken = "synthetic-review-token-that-opens-nothing";
          const requestToken = "synthetic-request-token-that-applies-nothing";

          yield* app.request("/api/review-link", {
            headers: { "x-review-token": reviewToken },
          });
          yield* app.request("/api/contract-requests/confirmation", {
            body: { token: requestToken, workspaceId: customer.id },
          });

          // What an address holds is written, which is why no token goes
          // in one: this search would find it.
          const inAddress = "synthetic-marker-in-an-address";

          yield* app.request(`/api/connect-links/${inAddress}`);

          const all = written();

          assert.include(all, inAddress);

          // The requests were written about at all: each has its line and
          // its span.
          assert.include(all, "/api/connect-links/start");
          assert.isAbove(spans.length, 10);

          for (const [name, secret] of [
            ["a connect link's token", token],
            ["a partner key", key],
            ["a review link's token", reviewToken],
            ["a contract request's token", requestToken],
          ] as const) {
            assert.notInclude(all, secret, name);
          }
        })
    );
  }
);

// Two-step verification needs a confirmed address: this app asks for one.
const TwoStepTest = Layer.mergeAll(
  TestApp.layerWith(
    {},
    Layer.merge(capture, Layer.succeed(Tracer.Tracer, tracer))
  ),
  MigratedSqlLive
);

layer(TwoStepTest, { excludeTestServices: true, timeout: "180 seconds" })(
  "what the server writes about two-step verification",
  (it) => {
    it.effect("holds no authenticator key, no code and no recovery code", () =>
      Effect.gen(function* twoStep() {
        const app = yield* TestApp;
        const person = yield* signedUp("secrets-two-step");
        const { backupCodes, cookies, key, totpURI } = yield* enrolled(person);
        const secret = new URL(totpURI).searchParams.get("secret") ?? "";

        assert.isAbove(secret.length, 20);

        // A sign-in with a wrong code, then a recovery code, then new
        // codes and the account's status.
        const browser = withCookies("", yield* passwordStep(person.email));
        const wrong = yield* Effect.promise(async () => await wrongCodeOf(key));
        const code = yield* Effect.promise(async () => await codeOf(key));

        yield* secondStep(browser, { code: wrong, route: "verify-totp" });
        yield* secondStep(browser, {
          code: backupCodes[0] ?? "",
          route: "verify-backup-code",
        });

        const renewed = yield* app.request(
          "/api/auth/two-factor/generate-backup-codes",
          { body: { password }, headers: { cookie: cookies } }
        );

        yield* app.request("/api/me/two-step", {
          headers: { cookie: cookies },
        });

        const all = written();

        assert.include(all, "/api/auth/two-factor/verify-totp");

        for (const [name, value] of [
          ["the authenticator's key", secret],
          ["the URI the QR code holds", totpURI],
          ...backupCodes.map((recovery) => ["a recovery code", recovery]),
          ...(JSON.stringify(renewed.body)
            .match(/[A-Za-z0-9]{5}-[A-Za-z0-9]{5}/gu)
            ?.map((recovery) => ["a new recovery code", recovery]) ?? []),
        ] as const) {
          assert.notInclude(all, value, name);
        }

        // A six-digit code could be part of any number: it never appears
        // as a value of its own.
        for (const sent of [wrong, code]) {
          assert.notInclude(all, `"${sent}"`);
          assert.notInclude(all, `=${sent}`);
        }
      })
    );
  }
);

layer(
  Layer.mergeAll(WebhooksTest, capture, Layer.succeed(Tracer.Tracer, tracer)),
  { timeout: "60 seconds" }
)("what the server writes about webhook deliveries", (it) => {
  it.effect(
    "holds no value of an endpoint's headers, nor does the delivery log",
    () =>
      Effect.gen(function* searched() {
        const owner = yield* freshOwner;
        const endpoints = yield* WebhookEndpoints;
        const deliveries = yield* WebhookDeliveries;
        const transport = yield* FakeTransport;
        const first = "Bearer synthetic-header-value-first";
        const second = "synthetic-header-value-second";

        const { endpoint, host } = yield* freshEndpoint(owner, {
          headers: [{ name: "Authorization", value: first }],
        });

        const changed = yield* endpoints.update(owner, endpoint.id, {
          headers: [
            { name: "Authorization", value: first },
            { name: "X-Gateway-Key", value: second },
          ],
        });

        // Delivered with them, refused by the receiver, then tried again.
        yield* transport.next(
          host,
          answered(500, "Internal error"),
          answered(204)
        );

        const delivery = yield* endpoints.sendTest(owner, endpoint.id);

        yield* DeliverWebhook.use((delivering) =>
          delivering.attempt(delivery.id, 1)
        );
        yield* DeliverWebhook.use((delivering) =>
          delivering.attempt(delivery.id, 2)
        );

        const [request] = yield* transport.sentTo(host);

        assert.strictEqual(request?.headers["X-Gateway-Key"], second);

        const log = yield* deliveries.page(owner, endpoint.id, {
          after: Option.none(),
          limit: 10,
        });

        const shown = JSON.stringify([
          toEndpointView(changed),
          toEndpointView(yield* endpoints.get(owner, endpoint.id)),
          log.items.map(toDeliveryView),
        ]);

        const all = written();

        assert.isAbove(spans.length, 0);

        for (const value of [first, second]) {
          assert.notInclude(all, value);
          assert.notInclude(shown, value);
        }
      })
  );
});

layer(Layer.mergeAll(capture, Layer.succeed(Tracer.Tracer, tracer)), {
  excludeTestServices: true,
  timeout: "60 seconds",
})("what the server writes about publishing a reel", (it) => {
  it.effect(
    "holds no Page token, which the upload carries in its Authorization header",
    () =>
      Effect.gen(function* searched() {
        const token = "synthetic-page-token-in-an-upload-header";
        const clip = testFile("video", 4096);
        const graph = yield* fakeMetaGraph([token]);

        const client = yield* metaClientWith({
          appSecret: graphAppSecret,
          credentials: credentialsOf(
            { accountId: facebookPageId, platform: "facebook" },
            [token]
          ),
          files: [clip],
          platform: "facebook",
          url: graph.url,
        });

        const result = yield* client
          .publish(
            yield* outgoing({
              accountId: facebookPageId,
              media: [attached(clip)],
              options: Option.some(new FacebookOptions({ format: "reel" })),
            })
          )
          .pipe(Effect.withSpan("test.reel"));

        assert.strictEqual(result._tag, "published");
        assert.isTrue(
          graph
            .requests()
            .some((request) => request.path.startsWith("/video-upload/"))
        );
        // The upload was written about, with its address.
        assert.include(written(), "/video-upload/");
        assert.notInclude(written(), token);
      }).pipe(Effect.scoped)
  );
});

const shortBase = "http://links.example.com/api/l/";

const shortLinkSettings = {
  ...unconfirmedEmails,
  PEAL_SHORT_LINK_BASE: shortBase,
};

// The app with short links on, and the context beside it to issue one.
const ShortLinksTest = Layer.mergeAll(
  TestApp.layerWith(
    shortLinkSettings,
    Layer.merge(capture, Layer.succeed(Tracer.Tracer, tracer))
  ),
  ShortLinksLive.pipe(
    Layer.provide(OpenLinkStanding),
    Layer.provide(
      ConfigProvider.layerAdd(ConfigProvider.fromUnknown(shortLinkSettings), {
        asPrimary: true,
      })
    ),
    Layer.provideMerge(DatabaseTest)
  )
);

layer(ShortLinksTest, { excludeTestServices: true, timeout: "120 seconds" })(
  "what the server writes about a short link followed",
  (it) => {
    // Nothing of the visitor either: no span holds their browser or
    // address, as the privacy register says.
    it.effect("holds its path, never where it leads nor who followed it", () =>
      Effect.gen(function* followed() {
        const app = yield* TestApp;
        const links = yield* ShortLinks;

        const destination =
          "https://example.test/synthetic-destination-never-logged";

        const target = yield* liveTarget("logged-link", true);

        const [shortUrl = ""] = yield* links.issue({
          channelId: ChannelIdSchema.make(target.channelId),
          destinations: [destination],
          part: 0,
          postId: PostIdSchema.make(target.postId),
          targetId: PostTargetIdSchema.make(target.targetId),
          workspaceId: WorkspaceIdSchema.make(target.workspaceId),
        });

        const { pathname } = new URL(shortUrl);
        const agent = "Mozilla/5.0 (synthetic visitor agent)";

        const reply = yield* app.request(pathname, {
          headers: { "user-agent": agent, "x-forwarded-for": "203.0.113.77" },
        });

        assert.strictEqual(reply.status, 302);
        assert.include(written(), pathname);
        assert.notInclude(written(), "synthetic-destination-never-logged");
        assert.notInclude(written(), "synthetic visitor agent");
        assert.notInclude(written(), "203.0.113.77");
      })
    );
  }
);

// The image provider's key, and the prompt, which the server never writes:
// a loopback provider that refuses a prompt naming "refused" with 401, and
// answers any other with an image.
const imageKey = "sk_test_synthetic_image_provider_key";
const inPrompt = "synthetic-prompt-marker-in-a-secret-test";

const decodePort = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Number })
);

const imageProvider = Effect.acquireRelease(
  Effect.promise(async () => {
    const png = await sharp({
      create: { background: "#224466", channels: 3, height: 16, width: 16 },
    })
      .png()
      .toBuffer();

    const server = createServer((request, response) => {
      const chunks: Buffer[] = [];

      request.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      request.on("end", () => {
        const refused = Buffer.concat(chunks)
          .toString("utf-8")
          .includes("refused");

        response.writeHead(refused ? 401 : 200, {
          "content-type": "application/json",
        });
        response.end(
          JSON.stringify(
            refused
              ? { error: { message: `Invalid key ${imageKey}` } }
              : { created: 1, data: [{ b64_json: png.toString("base64") }] }
          )
        );
      });
    });

    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    return {
      server,
      url: `http://127.0.0.1:${String(decodePort(server.address()).port)}/v1`,
    };
  }),
  ({ server }) =>
    Effect.promise(async () => {
      server.closeAllConnections();
      server.close();
      await once(server, "close");
    })
);

const ImagesTest = Layer.unwrap(
  imageProvider.pipe(
    Effect.map(({ url }) =>
      Layer.mergeAll(
        TestApp.layerWith(
          {
            ...unconfirmedEmails,
            PEAL_AI_IMAGE_API_KEY: imageKey,
            PEAL_AI_IMAGE_BASE_URL: url,
            PEAL_AI_IMAGE_MODEL: "synthetic-image-model",
            PEAL_AI_IMAGE_PROVIDER: "openai-compatible",
          },
          Layer.merge(capture, Layer.succeed(Tracer.Tracer, tracer))
        ),
        MigratedSqlLive
      )
    )
  )
);

const MadeSchema = Schema.Struct({ id: Schema.String });

layer(ImagesTest, { excludeTestServices: true, timeout: "180 seconds" })(
  "what the server writes about images",
  (it) => {
    it.effect("holds neither the image provider's key nor the prompt", () =>
      Effect.gen(function* images() {
        const app = yield* TestApp;
        const owner = yield* signedUp("secrets-images");
        const workspaceId = yield* workspaceOf(owner, "Images");
        const headers = { cookie: owner.cookies };
        const path = `/api/workspaces/${workspaceId}/assistant/images`;

        const made = yield* app.request(path, {
          body: { aspect: "square", prompt: `A lighthouse. ${inPrompt}` },
          headers,
        });

        assert.strictEqual(made.status, 201);

        const refused = yield* app.request(path, {
          body: { aspect: "square", prompt: `It is refused. ${inPrompt}` },
          headers,
        });

        assert.strictEqual(refused.status, 503);

        const { id } = yield* bodyOf(MadeSchema, made);

        yield* app.request(`/api/workspaces/${workspaceId}/media/${id}`, {
          headers,
          method: "DELETE",
        });

        // The refusal is told to the operator, by its status alone.
        assert.include(written(), "refused the server's settings");
        assert.notInclude(written(), imageKey);
        assert.notInclude(written(), inPrompt);
      })
    );
  }
);

// The key a workspace gave for its own image provider, and what it asks
// for: neither is ever written, in a log, a span, the activity log or an
// answer. Saving calls no provider, so the app saves one at a public
// literal address it never reaches, and is refused one inside.
const workspaceKey = "synthetic-workspace-image-key";
const inOwnPrompt = "synthetic-prompt-marker-for-a-workspace-provider";

const OwnProviderAppTest = Layer.mergeAll(
  TestApp.layerWith(
    { ...unconfirmedEmails, PEAL_TOKEN_KEYS: syntheticKeyring },
    Layer.merge(capture, Layer.succeed(Tracer.Tracer, tracer))
  ),
  MigratedSqlLive
);

const ActivityRowsSchema = Schema.Array(Schema.Struct({ row: Schema.String }));

layer(OwnProviderAppTest, {
  excludeTestServices: true,
  timeout: "180 seconds",
})("what the server writes about a workspace's image provider", (it) => {
  it.effect(
    "holds its key nowhere: logs, spans, the activity log, the answers",
    () =>
      Effect.gen(function* searched() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const owner = yield* signedUp("secrets-own-images");
        const workspaceId = yield* workspaceOf(owner, "Own images");
        const headers = { cookie: owner.cookies };
        const path = `/api/workspaces/${workspaceId}/assistant/image-provider`;

        const saved = yield* app.request(path, {
          body: {
            apiKey: workspaceKey,
            baseUrl: "https://1.1.1.1/v1",
            model: "synthetic-image-model",
          },
          headers,
          method: "PUT",
        });

        const inside = yield* app.request(path, {
          body: {
            apiKey: workspaceKey,
            baseUrl: "https://10.0.0.8/v1",
            model: "synthetic-image-model",
          },
          headers,
          method: "PUT",
        });

        const read = yield* app.request(path, { headers });

        const status = yield* app.request(
          `/api/workspaces/${workspaceId}/assistant`,
          { headers }
        );

        const removed = yield* app.request(path, { headers, method: "DELETE" });

        assert.deepStrictEqual(
          [
            saved.status,
            inside.status,
            read.status,
            status.status,
            removed.status,
          ],
          [200, 422, 200, 200, 204]
        );

        const activity =
          yield* sql`SELECT row_to_json(e)::text AS row FROM activity.events e WHERE workspace_id = ${workspaceId}`.pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(ActivityRowsSchema))
          );

        // The writes were kept, done and refused, without their bodies.
        assert.isAtLeast(activity.length, 3);

        const answers = JSON.stringify(
          [saved, inside, read, status].map(({ body }) => body)
        );

        for (const text of [written(), answers, JSON.stringify(activity)]) {
          assert.notInclude(text, workspaceKey);
        }

        // Nor the host of an address refused when it was saved.
        assert.notInclude(written(), "10.0.0.8");
      })
  );
});

// The key a workspace gave for its own text provider: never written, in a
// log, a span, the activity log or an answer. Saving calls no provider.
const workspaceTextKey = "synthetic-workspace-text-key";

layer(OwnProviderAppTest, {
  excludeTestServices: true,
  timeout: "180 seconds",
})("what the server writes about a workspace's text provider", (it) => {
  it.effect(
    "holds its key nowhere: logs, spans, the activity log, the answers",
    () =>
      Effect.gen(function* searched() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const owner = yield* signedUp("secrets-own-text");
        const workspaceId = yield* workspaceOf(owner, "Own text");
        const headers = { cookie: owner.cookies };
        const path = `/api/workspaces/${workspaceId}/assistant/text-provider`;

        const saved = yield* app.request(path, {
          body: {
            apiKey: workspaceTextKey,
            baseUrl: "https://1.1.1.1/v1",
            kind: "openai-compatible",
            model: "synthetic-text-model",
          },
          headers,
          method: "PUT",
        });

        const inside = yield* app.request(path, {
          body: {
            apiKey: workspaceTextKey,
            baseUrl: "https://10.0.0.9/v1",
            kind: "anthropic",
            model: "synthetic-text-model",
          },
          headers,
          method: "PUT",
        });

        const read = yield* app.request(path, { headers });

        const status = yield* app.request(
          `/api/workspaces/${workspaceId}/assistant`,
          { headers }
        );

        const removed = yield* app.request(path, { headers, method: "DELETE" });

        assert.deepStrictEqual(
          [
            saved.status,
            inside.status,
            read.status,
            status.status,
            removed.status,
          ],
          [200, 422, 200, 200, 204]
        );

        const activity =
          yield* sql`SELECT row_to_json(e)::text AS row FROM activity.events e WHERE workspace_id = ${workspaceId}`.pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(ActivityRowsSchema))
          );

        assert.isAtLeast(activity.length, 3);

        const answers = JSON.stringify(
          [saved, inside, read, status].map(({ body }) => body)
        );

        for (const text of [written(), answers, JSON.stringify(activity)]) {
          assert.notInclude(text, workspaceTextKey);
        }

        assert.notInclude(written(), "10.0.0.9");
      })
  );
});

const OwnImagesTest = Layer.mergeAll(
  S3MediaStorageLive,
  DrizzleMediaAssetsLive,
  capture,
  Layer.succeed(Tracer.Tracer, tracer)
).pipe(
  Layer.provideMerge(AssistantDatabaseTest),
  Layer.provide(storageSettings)
);

// A provider on loopback that refuses a prompt naming "refused" with 401,
// quoting the key it was sent, and answers any other with an image.
const ownProvider = Effect.acquireRelease(
  Effect.promise(async () => {
    const png = await sharp({
      create: { background: "#446622", channels: 3, height: 16, width: 16 },
    })
      .png()
      .toBuffer();

    const server = createServer((request, response) => {
      const chunks: Buffer[] = [];

      request.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      request.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        const refused = body.includes("refused");

        response.writeHead(refused ? 401 : 200, {
          "content-type": "application/json",
        });
        response.end(
          JSON.stringify(
            refused
              ? {
                  error: {
                    message: `Invalid key ${request.headers.authorization ?? ""} for ${body}`,
                  },
                }
              : { created: 1, data: [{ b64_json: png.toString("base64") }] }
          )
        );
      });
    });

    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    return {
      server,
      url: `http://127.0.0.1:${String(decodePort(server.address()).port)}/v1`,
    };
  }),
  ({ server }) =>
    Effect.promise(async () => {
      server.closeAllConnections();
      server.close();
      await once(server, "close");
    })
);

layer(OwnImagesTest, { excludeTestServices: true, timeout: "120 seconds" })(
  "what the server writes about a workspace's own images",
  (it) => {
    it.effect(
      "holds neither the workspace's key, its provider's address nor the prompt",
      () =>
        Effect.gen(function* images() {
          const assistant = yield* WritingAssistant;
          const sql = yield* SqlClient.SqlClient;
          const host = yield* ownProvider;
          const workspaceId = WorkspaceIdSchema.make(crypto.randomUUID());
          const admin = actorIn(workspaceId, permissionsFor("admin"));

          yield* Effect.addFinalizer(() =>
            sql`DELETE FROM assistant.image_providers WHERE workspace_id = ${workspaceId}`.pipe(
              Effect.andThen(
                sql`DELETE FROM media.media_assets WHERE workspace_id = ${workspaceId}`
              ),
              Effect.ignore
            )
          );

          const saved = yield* assistant.saveImageProvider(admin, {
            apiKey: workspaceKey,
            baseUrl: host.url,
            model: "synthetic-image-model",
          });

          const made = yield* assistant.generateImage(actorIn(workspaceId), {
            aspect: "square",
            prompt: `A field of wheat. ${inOwnPrompt}`,
          });

          const refused = yield* assistant
            .generateImage(actorIn(workspaceId), {
              aspect: "square",
              prompt: `It is refused. ${inOwnPrompt}`,
            })
            .pipe(Effect.flip);

          assert.strictEqual(made.kind, "image");
          assert.deepInclude(refused, {
            _tag: "ImageProviderRefused",
            status: 401,
          });

          const all = written();

          // The refusal was told, by its status.
          assert.include(all, "refused its settings");

          for (const text of [all, JSON.stringify([saved, made, refused])]) {
            assert.notInclude(text, workspaceKey);
            assert.notInclude(text, inOwnPrompt);
          }

          assert.notInclude(all, new URL(host.url).host);
        }).pipe(Effect.provide(imagesTest({ providers: "loopback" })))
    );
  }
);
