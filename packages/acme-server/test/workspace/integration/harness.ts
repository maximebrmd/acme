// The whole server, without a socket, for tests that sign people up: the
// HTTP API and Better Auth on the database DATABASE_URL names, sending email
// to the development stack's Mailpit (SMTP_URL and MAILPIT_URL override it)
// and storing media in its SeaweedFS, under tests/media/.
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
import { SqlClient } from "effect/sql";

import { AppLive } from "#app/server.ts";
import { SqlLive } from "#shared/infrastructure/database.ts";
import { storageSettings } from "#test/media/support.ts";

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
            AppLive.pipe(
              Layer.provide(HttpServer.layerServices),
              Layer.provide(storageSettings)
            ),
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
 * several emails in a test. Mailpit in Docker may take seconds to greet each
 * new SMTP connection, and test files run in parallel, hence the patience.
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
    Effect.retry({ schedule: Schedule.spaced("200 millis"), times: 300 }),
    Effect.timeout(Duration.seconds(60)),
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

/** Decodes a reply's JSON body, which a test expects to have this shape. */
export const bodyOf = <S extends Schema.Top>(schema: S, reply: Reply) =>
  Schema.decodeUnknownEffect(schema)(reply.body).pipe(Effect.orDie);

const SignedUpSchema = Schema.Struct({
  user: Schema.Struct({ id: Schema.String }),
});

export interface Person {
  /** The session cookies of a fresh sign-in. */
  readonly cookies: string;
  readonly email: string;
  readonly id: string;
}

/** Signs in with the test password, and answers with the session cookies. */
export const signIn = Effect.fn("signIn")(function* signIn(email: string) {
  const app = yield* TestApp;

  const reply = yield* app.request("/api/auth/sign-in/email", {
    body: { email, password },
  });

  if (reply.status !== 200) {
    return yield* Effect.die(new Error(`Sign-in answered ${reply.status}`));
  }

  return cookiesOf(reply);
});

/** Someone who signed up and confirmed their email from Mailpit. */
export const confirmedAccount = Effect.fn("confirmedAccount")(
  function* confirmedAccount(label: string, locale: "en" | "fr" = "en") {
    const app = yield* TestApp;
    const email = newEmail(label);

    const created = yield* app.request("/api/auth/sign-up/email", {
      body: { email, locale, name: label, password },
    });

    const { user } = yield* bodyOf(SignedUpSchema, created);

    const confirmation = yield* emailTo(
      email,
      locale === "fr" ? /^Confirmez/u : /^Confirm your email/u
    );

    const link = linkIn(confirmation);

    yield* app.request(`${link.pathname}${link.search}`);

    return { email, id: user.id };
  }
);

/** Someone who signed up, confirmed their email and signed in. */
export const signedUp = Effect.fn("signedUp")(function* signedUp(
  label: string,
  locale: "en" | "fr" = "en"
) {
  const account = yield* confirmedAccount(label, locale);

  return { ...account, cookies: yield* signIn(account.email) };
});

const WorkspaceSchema = Schema.Struct({ id: Schema.String });

/** A workspace the person creates, and so owns. */
export const workspaceOf = Effect.fn("workspaceOf")(function* workspaceOf(
  owner: Person,
  name: string
) {
  const app = yield* TestApp;

  const reply = yield* app.request("/api/auth/organization/create", {
    body: { name, slug: `${name.toLowerCase()}-${randomUUID()}` },
    headers: { cookie: owner.cookies },
  });

  return (yield* bodyOf(WorkspaceSchema, reply)).id;
});

const ApiKeyCreatedSchema = Schema.Struct({
  apiKey: Schema.Struct({ id: Schema.String }),
  key: Schema.String,
});

/** An API key the owner creates for their workspace, through Acme's API. */
export const apiKeyOf = Effect.fn("apiKeyOf")(function* apiKeyOf(
  owner: Person,
  workspaceId: string,
  permissions: readonly string[]
) {
  const app = yield* TestApp;

  const reply = yield* app.request(`/api/workspaces/${workspaceId}/api-keys`, {
    body: { name: "ci", permissions },
    headers: { cookie: owner.cookies },
  });

  if (reply.status !== 201) {
    return yield* Effect.die(
      new Error(`Creating an API key answered ${reply.status}`)
    );
  }

  return yield* bodyOf(ApiKeyCreatedSchema, reply);
});

/**
 * Makes a user staff: the admin plugin's role. Sign them in afterwards, as a
 * session caches the role it started with.
 */
export const makeAdmin = Effect.fn("makeAdmin")(function* makeAdmin(
  userId: string
) {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`UPDATE auth."user" SET role = 'admin' WHERE id = ${userId}`;
});

/** The app, and a database connection for what only staff tools do. */
export const IntegrationLive = Layer.mergeAll(TestApp.layer, SqlLive);
