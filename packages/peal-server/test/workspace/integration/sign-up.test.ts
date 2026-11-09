import { assert, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";

import {
  cookiesOf,
  emailTo,
  linkIn,
  newEmail,
  password,
  TestApp,
} from "./harness.ts";
import type { Reply } from "./harness.ts";

const SignUpSchema = Schema.Struct({
  token: Schema.NullOr(Schema.String),
  user: Schema.Struct({
    email: Schema.String,
    emailVerified: Schema.Boolean,
    id: Schema.String,
    locale: Schema.String,
  }),
});

const SessionSchema = Schema.Struct({
  user: Schema.Struct({ email: Schema.String, emailVerified: Schema.Boolean }),
});

const ErrorSchema = Schema.Struct({ code: Schema.String });

const signUp = Effect.fn("signUp")(function* signUp(
  email: string,
  locale: "en" | "fr"
) {
  const app = yield* TestApp;

  return yield* app.request("/api/auth/sign-up/email", {
    body: {
      callbackURL: locale === "fr" ? "/fr/verify-email" : "/verify-email",
      email,
      locale,
      name: "Ada Lovelace",
      password,
    },
  });
});

const signIn = Effect.fn("signIn")(function* signIn(
  email: string,
  secret: string
) {
  const app = yield* TestApp;

  return yield* app.request("/api/auth/sign-in/email", {
    body: { email, password: secret },
  });
});

const decode = <S extends Schema.Top>(schema: S, reply: Reply) =>
  Schema.decodeUnknownEffect(schema)(reply.body).pipe(Effect.orDie);

// Version nibble of a UUID: 4 for random ids.
const versionOf = (id: string) => id.charAt(14);

layer(TestApp.layer, { excludeTestServices: true, timeout: "180 seconds" })(
  "signing up with an email and a password",
  (it) => {
    it.effect(
      "asks for the address to be confirmed, in the reader's language, before signing in",
      () =>
        Effect.gen(function* confirmsEmail() {
          const app = yield* TestApp;
          const email = newEmail("ada");

          const created = yield* signUp(email, "fr");

          assert.strictEqual(created.status, 200);

          const { token, user } = yield* decode(SignUpSchema, created);

          assert.isNull(token);
          assert.isFalse(user.emailVerified);
          assert.strictEqual(user.locale, "fr");
          assert.strictEqual(versionOf(user.id), "4");

          const early = yield* signIn(email, password);

          assert.strictEqual(early.status, 403);
          assert.strictEqual(
            (yield* decode(ErrorSchema, early)).code,
            "EMAIL_NOT_VERIFIED"
          );

          const message = yield* emailTo(email, /^Confirmez votre adresse/u);
          const link = linkIn(message);

          assert.strictEqual(link.pathname, "/api/auth/verify-email");
          assert.include(message.HTML, "Confirmer mon adresse");

          // The link signs the reader in and takes them to the page the web
          // app asked for.
          const verified = yield* app.request(`${link.pathname}${link.search}`);

          assert.strictEqual(verified.status, 302);
          assert.strictEqual(
            verified.headers.get("location"),
            "/fr/verify-email"
          );

          const session = yield* app.request("/api/auth/get-session", {
            headers: { cookie: cookiesOf(verified) },
          });

          assert.isTrue(
            (yield* decode(SessionSchema, session)).user.emailVerified
          );

          const signedIn = yield* signIn(email, password);

          assert.strictEqual(signedIn.status, 200);
          assert.include(cookiesOf(signedIn), "peal.session_token=");
        })
    );

    it.effect("answers a sign-up for a known email like any other", () =>
      Effect.gen(function* knownEmail() {
        const email = newEmail("grace");

        const first = yield* signUp(email, "en");
        const again = yield* signUp(email, "en");

        assert.strictEqual(again.status, first.status);

        const original = yield* decode(SignUpSchema, first);
        const repeated = yield* decode(SignUpSchema, again);

        assert.notStrictEqual(repeated.user.id, original.user.id);
        assert.strictEqual(versionOf(repeated.user.id), "4");
        assert.deepStrictEqual(
          Object.keys(repeated.user).toSorted(),
          Object.keys(original.user).toSorted()
        );
      })
    );

    it.effect("signs out", () =>
      Effect.gen(function* signsOut() {
        const app = yield* TestApp;
        const email = newEmail("katherine");

        yield* signUp(email, "en");

        const message = yield* emailTo(email, /^Confirm your email/u);
        const link = linkIn(message);
        const verified = yield* app.request(`${link.pathname}${link.search}`);
        const cookie = cookiesOf(verified);

        const out = yield* app.request("/api/auth/sign-out", {
          body: {},
          headers: { cookie },
        });

        assert.strictEqual(out.status, 200);
        assert.include(
          out.headers.getSetCookie().join("\n"),
          "peal.session_token=; Max-Age=0"
        );

        // The session is gone. Cookies kept from before still carry a copy
        // of it, which reads may trust for up to five minutes.
        const after = yield* app.request(
          "/api/auth/get-session?disableCookieCache=true",
          { headers: { cookie } }
        );

        assert.isNull(after.body);
      })
    );

    it.effect("resets a forgotten password through the emailed link", () =>
      Effect.gen(function* resetsPassword() {
        const app = yield* TestApp;
        const email = newEmail("hedy");
        const newPassword = "a much longer passphrase";

        yield* signUp(email, "en");

        const confirmation = yield* emailTo(email, /^Confirm your email/u);
        const confirm = linkIn(confirmation);

        yield* app.request(`${confirm.pathname}${confirm.search}`);

        const requested = yield* app.request(
          "/api/auth/request-password-reset",
          { body: { email, redirectTo: "/reset-password" } }
        );

        assert.strictEqual(requested.status, 200);

        const message = yield* emailTo(email, /^Reset your Peal password/u);
        const link = linkIn(message);

        // The link checks the token, then hands it to the web app's page.
        const opened = yield* app.request(`${link.pathname}${link.search}`);

        const location = new URL(
          opened.headers.get("location") ?? "",
          "http://localhost:3001"
        );

        assert.strictEqual(opened.status, 302);
        assert.strictEqual(location.pathname, "/reset-password");

        const token = location.searchParams.get("token") ?? "";

        const reset = yield* app.request("/api/auth/reset-password", {
          body: { newPassword, token },
        });

        assert.strictEqual(reset.status, 200);
        assert.strictEqual((yield* signIn(email, password)).status, 401);
        assert.strictEqual((yield* signIn(email, newPassword)).status, 200);

        const reused = yield* app.request("/api/auth/reset-password", {
          body: { newPassword: "yet another long passphrase", token },
        });

        assert.strictEqual(reused.status, 400);
      })
    );
  }
);
