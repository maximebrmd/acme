// What the server writes about a request never holds a credential: a
// connect link's token, a review link's, a partner key, or the token of a
// link that applies a request to cancel. The app runs here as production
// runs it, logging each request and tracing it, and everything a log line
// or a span would export is searched for each secret.
import { assert, layer } from "@effect/vitest";
import {
  Cause,
  Effect,
  Exit,
  Layer,
  Logger,
  References,
  Schema,
  Tracer,
} from "effect";

import {
  bodyOf,
  MigratedSqlLive,
  TestApp,
  unconfirmedEmails,
} from "#test/workspace/integration/harness.ts";
import {
  bearer,
  customerOf,
  keyOf,
  partnerOf,
} from "#test/workspace/integration/partner-support.ts";

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
