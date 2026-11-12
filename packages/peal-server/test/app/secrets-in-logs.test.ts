// What the server writes about a request never holds a credential: a
// connect link's token, a review link's, a partner key, the token of a
// link that applies a request to cancel, the value of a header a webhook
// endpoint's deliveries carry, or two-step verification's key, codes and
// recovery codes. The app runs here as production
// runs it, logging each request and tracing it, and everything a log line
// or a span would export is searched for each secret.
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

import { FacebookOptions } from "#publishing/domain/facebook-options.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import { ShortLinks } from "#shortlinks/application/short-links.ts";
import { ShortLinksLive } from "#shortlinks/container.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
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

        const [shortUrl = ""] = yield* links.issue({
          channelId: yield* newId(ChannelIdSchema),
          destinations: [destination],
          part: 0,
          postId: yield* newId(PostIdSchema),
          targetId: yield* newId(PostTargetIdSchema),
          workspaceId: yield* freshWorkspace,
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
