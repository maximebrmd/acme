// The whole server, without a socket, for tests that sign people up: the
// HTTP API and Better Auth on the database DATABASE_URL names, sending email
// to the development stack's Mailpit (SMTP_URL and MAILPIT_URL override it).
import { randomUUID } from "node:crypto";

import {
  Config,
  Context,
  Duration,
  Effect,
  Layer,
  Option,
  Schedule,
  Schema,
} from "effect";
import { HttpRouter, HttpServer } from "effect/http";

import { AppLive } from "#app/server.ts";

/** The web app's origin, which the server trusts by default. */
export const origin = "http://localhost:3001";

const mailpitUrl = Config.String("MAILPIT_URL").pipe(
  Config.withDefault("http://127.0.0.1:18025")
);

/** A fresh, synthetic address, so runs and parallel tests never meet. */
export const newEmail = (label: string): string =>
  `${label}+${randomUUID()}@example.test`;

export const password = "correct horse battery staple";

export interface Reply {
  readonly body: unknown;
  readonly headers: Headers;
  readonly status: number;
}

/** The cookies a reply sets, as a Cookie header sends them back. */
export const cookiesOf = (reply: Reply): string =>
  reply.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0] ?? "")
    .filter((cookie) => !cookie.endsWith("="))
    .join("; ");

const decodeJson = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Unknown)
);

export class TestApp extends Context.Service<
  TestApp,
  {
    readonly request: (
      path: string,
      init?: {
        readonly body?: unknown;
        readonly headers?: Readonly<Record<string, string>>;
        readonly method?: string;
      }
    ) => Effect.Effect<Reply>;
  }
>()("acme-server/test/TestApp") {
  static readonly layer = Layer.effect(
    TestApp,
    Effect.gen(function* testApp() {
      const app = yield* Effect.acquireRelease(
        Effect.sync(() =>
          HttpRouter.toWebHandler(
            AppLive.pipe(Layer.provide(HttpServer.layerServices)),
            { disableLogger: true }
          )
        ),
        ({ dispose }) => Effect.promise(dispose)
      );

      return TestApp.of({
        request: (path, init = {}) =>
          Effect.promise(async () => {
            const headers = new Headers({ origin, ...init.headers });

            if (init.body !== undefined) {
              headers.set("content-type", "application/json");
            }

            const response = await app.handler(
              new Request(new URL(path, origin).href, {
                body:
                  init.body === undefined
                    ? undefined
                    : JSON.stringify(init.body),
                headers,
                method:
                  init.method ?? (init.body === undefined ? "GET" : "POST"),
                redirect: "manual",
              })
            );

            const text = await response.text();

            return {
              body: Option.getOrElse(decodeJson(text), () => text),
              headers: response.headers,
              status: response.status,
            };
          }),
      });
    })
  );
}

const MailpitSearchSchema = Schema.Struct({
  messages: Schema.Array(Schema.Struct({ ID: Schema.String })),
});

export const MailpitMessageSchema = Schema.Struct({
  HTML: Schema.String,
  Subject: Schema.String,
  Text: Schema.String,
});

export type MailpitMessage = typeof MailpitMessageSchema.Type;

const getJson = Effect.fn("getJson")(function* getJson<S extends Schema.Top>(
  url: string,
  schema: S
) {
  const body = yield* Effect.promise(async () => {
    const response = await fetch(url);
    const json: unknown = await response.json();

    return json;
  });

  return yield* Schema.decodeUnknownEffect(schema)(body);
});

/**
 * The email Mailpit received for an address, waiting for it: Better Auth
 * sends after it answers. Its subject must match, as one address receives
 * several emails in a test.
 */
export const emailTo = Effect.fn("emailTo")(function* emailTo(
  address: string,
  subject: RegExp
) {
  const base = yield* mailpitUrl;
  const query = new URLSearchParams({ query: `to:"${address}"` });

  const find = Effect.gen(function* find() {
    const { messages } = yield* getJson(
      `${base}/api/v1/search?${query.toString()}`,
      MailpitSearchSchema
    );

    const found = yield* Effect.all(
      messages.map((message) =>
        getJson(`${base}/api/v1/message/${message.ID}`, MailpitMessageSchema)
      )
    );

    return yield* Option.match(
      Option.fromNullishOr(
        found.find((message) => subject.test(message.Subject))
      ),
      {
        onNone: () => Effect.fail("not yet"),
        onSome: Effect.succeed,
      }
    );
  });

  return yield* find.pipe(
    Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 200 }),
    Effect.timeout(Duration.seconds(20)),
    Effect.orDie
  );
});

/** The first link in an email's text. */
export const linkIn = (message: MailpitMessage): URL => {
  const found = /https?:\/\/\S+/u.exec(message.Text)?.[0];

  if (found === undefined) {
    throw new Error(`No link in "${message.Subject}"`);
  }

  return new URL(found);
};
