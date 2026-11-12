import { assert, layer } from "@effect/vitest";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { HttpApiClient } from "effect/http-api";
import { SqlClient } from "effect/sql";
import { deviceCodeGrantType, OAuthApi } from "peal-contract";

import { registeredClient } from "#test/app/mcp-support.ts";
import {
  codeOf,
  commandLineToken,
  enable,
  enrolled,
  keyOf,
  passwordStep,
  secondStep,
  signInWithCode,
  withCookies,
  wrongCodeOf,
} from "#test/workspace/support.ts";

import {
  apiKeyOf,
  bodyOf,
  emailTo,
  inProcessHttpClient,
  MigratedSqlLive,
  origin,
  password,
  signedUp,
  TestApp,
  workspaceOf,
} from "./harness.ts";
import type { Person, Reply } from "./harness.ts";

// Two-step verification through Better Auth's two-factor plugin, end to
// end: turning it on, signing in with a code or a recovery code, the
// limits on guessing, trusted browsers, and the OAuth sign-ins (an MCP
// client's, the command line's device grant) that pass through it.

class OAuth extends Context.Service<
  OAuth,
  HttpApiClient.ForApi<typeof OAuthApi>
>()("peal-server/test/TwoStepOAuth") {
  static readonly layer = Layer.effect(
    OAuth,
    HttpApiClient.make(OAuthApi, { baseUrl: origin })
  ).pipe(Layer.provideMerge(inProcessHttpClient));
}

const TwoStepLive = Layer.mergeAll(OAuth.layer, MigratedSqlLive).pipe(
  Layer.provideMerge(TestApp.layerWith({ MCP_DYNAMIC_REGISTRATION: "true" }))
);

const ErrorSchema = Schema.Struct({ code: Schema.String });

const codeOfReply = (reply: Reply): string =>
  Schema.decodeUnknownOption(ErrorSchema)(reply.body).pipe(
    Option.match({ onNone: () => "", onSome: ({ code }) => code })
  );

const ChallengeSchema = Schema.Struct({
  twoFactorMethods: Schema.Array(Schema.String),
  twoFactorRedirect: Schema.Literal(true),
});

const CountSchema = Schema.Struct({ count: Schema.Number });

const sessionsOf = (userId: string) =>
  Effect.gen(function* countSessions() {
    const sql = yield* SqlClient.SqlClient;

    const rows =
      yield* sql`SELECT count(*)::int AS count FROM auth.session WHERE user_id = ${userId}`;

    return (yield* Schema.decodeUnknownEffect(CountSchema)(rows[0])).count;
  }).pipe(Effect.orDie);

const flagOf = (userId: string) =>
  Effect.gen(function* readFlag() {
    const sql = yield* SqlClient.SqlClient;

    const rows =
      yield* sql`SELECT two_factor_enabled AS enabled FROM auth."user" WHERE id = ${userId}`;

    return rows[0]?.["enabled"] === true;
  }).pipe(Effect.orDie);

const meStatus = (cookies: string) =>
  TestApp.use((app) =>
    app.request("/api/me", { headers: { cookie: cookies } })
  ).pipe(Effect.map(({ status }) => status));

const TwoStepStatusSchema = Schema.Struct({
  enabled: Schema.Boolean,
  recoveryCodesLeft: Schema.NullOr(Schema.Int),
  requiredBy: Schema.Array(
    Schema.Struct({ name: Schema.String, workspaceId: Schema.String })
  ),
});

const statusOf = (headers: Readonly<Record<string, string>>) =>
  Effect.gen(function* readStatus() {
    const app = yield* TestApp;

    return yield* bodyOf(
      TwoStepStatusSchema,
      yield* app.request("/api/me/two-step", { headers })
    );
  });

const now = (key: Uint8Array) => Effect.promise(async () => await codeOf(key));

const wrong = (key: Uint8Array) =>
  Effect.promise(async () => await wrongCodeOf(key));

// A person whose sessions are all gone, so a session row can only come
// from the sign-in under test.
const signedOut = (person: Person) =>
  Effect.gen(function* deleteSessions() {
    const sql = yield* SqlClient.SqlClient;

    yield* sql`DELETE FROM auth.session WHERE user_id = ${person.id}`;
  }).pipe(Effect.orDie);

layer(TwoStepLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "two-step verification",
  (it) => {
    it.effect("turns on only with the password and a first good code", () =>
      Effect.gen(function* turningOn() {
        const app = yield* TestApp;
        const person = yield* signedUp("enrol");

        const wrongPassword = yield* app.request(
          "/api/auth/two-factor/enable",
          {
            body: { password: "not the synthetic password" },
            headers: { cookie: person.cookies },
          }
        );

        assert.strictEqual(wrongPassword.status, 400);
        assert.strictEqual(codeOfReply(wrongPassword), "INVALID_PASSWORD");

        const { backupCodes, totpURI } = yield* enable(person);

        assert.lengthOf(backupCodes, 10);
        assert.match(totpURI, /^otpauth:\/\/totp\/Peal:/u);
        assert.isFalse(yield* flagOf(person.id));

        assert.strictEqual(new URL(totpURI).searchParams.get("issuer"), "Peal");

        const refused = yield* app.request("/api/auth/two-factor/verify-totp", {
          body: { code: yield* wrong(keyOf(totpURI)) },
          headers: { cookie: person.cookies },
        });

        assert.strictEqual(refused.status, 401);
        assert.strictEqual(codeOfReply(refused), "INVALID_CODE");
        assert.isFalse(yield* flagOf(person.id));

        const accepted = yield* app.request(
          "/api/auth/two-factor/verify-totp",
          {
            body: { code: yield* now(keyOf(totpURI)) },
            headers: { cookie: person.cookies },
          }
        );

        assert.strictEqual(accepted.status, 200);
        assert.isTrue(yield* flagOf(person.id));

        const again = yield* app.request("/api/auth/two-factor/enable", {
          body: { password },
          headers: { cookie: withCookies(person.cookies, accepted) },
        });

        assert.strictEqual(again.status, 400);
        assert.strictEqual(codeOfReply(again), "TOTP_ALREADY_ENABLED");
      })
    );

    it.effect("never gives a session for the password alone", () =>
      Effect.gen(function* passwordAlone() {
        const person = yield* signedUp("password-alone");
        const { key } = yield* enrolled(person);

        yield* signedOut(person);

        const challenged = yield* passwordStep(person.email);

        assert.strictEqual(challenged.status, 200);

        const challenge = yield* bodyOf(ChallengeSchema, challenged);

        assert.deepStrictEqual(challenge.twoFactorMethods, ["totp"]);
        assert.strictEqual(yield* sessionsOf(person.id), 0);
        assert.strictEqual(yield* meStatus(withCookies("", challenged)), 401);

        const browser = withCookies("", challenged);

        const refused = yield* secondStep(browser, {
          code: yield* wrong(key),
          route: "verify-totp",
        });

        assert.strictEqual(refused.status, 401);
        assert.strictEqual(yield* sessionsOf(person.id), 0);

        const verified = yield* secondStep(browser, {
          code: yield* now(key),
          route: "verify-totp",
        });

        assert.strictEqual(verified.status, 200);
        assert.strictEqual(yield* sessionsOf(person.id), 1);
        assert.strictEqual(
          yield* meStatus(withCookies(browser, verified)),
          200
        );

        // A challenge works once.
        const replayed = yield* secondStep(browser, {
          code: yield* now(key),
          route: "verify-totp",
        });

        assert.strictEqual(replayed.status, 401);
        assert.strictEqual(yield* sessionsOf(person.id), 1);
      })
    );

    it.effect("refuses a sixth attempt at one challenge", () =>
      Effect.gen(function* attempts() {
        const person = yield* signedUp("attempts");
        const { key } = yield* enrolled(person);

        yield* signedOut(person);

        const browser = withCookies("", yield* passwordStep(person.email));

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const refused = yield* secondStep(browser, {
            code: yield* wrong(key),
            route: "verify-totp",
          });

          assert.strictEqual(codeOfReply(refused), "INVALID_CODE");
        }

        const sixth = yield* secondStep(browser, {
          code: yield* now(key),
          route: "verify-totp",
        });

        assert.strictEqual(sixth.status, 400);
        assert.strictEqual(
          codeOfReply(sixth),
          "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE"
        );

        // The challenge is spent: a good code needs a new sign-in.
        const spent = yield* secondStep(browser, {
          code: yield* now(key),
          route: "verify-totp",
        });

        assert.strictEqual(codeOfReply(spent), "INVALID_TWO_FACTOR_COOKIE");
        assert.strictEqual(yield* sessionsOf(person.id), 0);
      })
    );

    it.effect("locks the account after ten failures in a row", () =>
      Effect.gen(function* lockout() {
        const sql = yield* SqlClient.SqlClient;
        const person = yield* signedUp("lockout");
        const { key } = yield* enrolled(person);

        yield* signedOut(person);

        for (let challenge = 0; challenge < 2; challenge += 1) {
          const browser = withCookies("", yield* passwordStep(person.email));

          for (let attempt = 0; attempt < 5; attempt += 1) {
            yield* secondStep(browser, {
              code: yield* wrong(key),
              route: "verify-totp",
            });
          }
        }

        const browser = withCookies("", yield* passwordStep(person.email));

        const locked = yield* secondStep(browser, {
          code: yield* now(key),
          route: "verify-totp",
        });

        assert.strictEqual(locked.status, 429);
        assert.strictEqual(codeOfReply(locked), "ACCOUNT_TEMPORARILY_LOCKED");
        assert.strictEqual(yield* sessionsOf(person.id), 0);

        // Fifteen minutes later.
        yield* sql`UPDATE auth.two_factor SET locked_until = now() - interval '1 second' WHERE user_id = ${person.id}`.pipe(
          Effect.orDie
        );

        const unlocked = yield* secondStep(browser, {
          code: yield* now(key),
          route: "verify-totp",
        });

        assert.strictEqual(unlocked.status, 200);
      })
    );

    it.effect("refuses a challenge older than ten minutes", () =>
      Effect.gen(function* expiry() {
        const sql = yield* SqlClient.SqlClient;
        const person = yield* signedUp("expiry");
        const { key } = yield* enrolled(person);

        yield* signedOut(person);

        const browser = withCookies("", yield* passwordStep(person.email));

        yield* sql`UPDATE auth.verification SET expires_at = now() - interval '1 second' WHERE value = ${person.id} AND identifier LIKE '2fa-%'`.pipe(
          Effect.orDie
        );

        const expired = yield* secondStep(browser, {
          code: yield* now(key),
          route: "verify-totp",
        });

        assert.strictEqual(expired.status, 401);
        assert.strictEqual(yield* sessionsOf(person.id), 0);
      })
    );

    it.effect("takes each recovery code once", () =>
      Effect.gen(function* recovery() {
        const app = yield* TestApp;
        const person = yield* signedUp("recovery");
        const { backupCodes } = yield* enrolled(person);
        const [first = ""] = backupCodes;

        yield* signedOut(person);

        const browser = withCookies("", yield* passwordStep(person.email));

        const used = yield* secondStep(browser, {
          code: first,
          route: "verify-backup-code",
        });

        assert.strictEqual(used.status, 200);
        assert.strictEqual(yield* sessionsOf(person.id), 1);

        const again = withCookies("", yield* passwordStep(person.email));

        const reused = yield* secondStep(again, {
          code: first,
          route: "verify-backup-code",
        });

        assert.strictEqual(reused.status, 401);
        assert.strictEqual(codeOfReply(reused), "INVALID_BACKUP_CODE");

        const session = withCookies(browser, used);

        assert.deepStrictEqual(yield* statusOf({ cookie: session }), {
          enabled: true,
          recoveryCodesLeft: 9,
          requiredBy: [],
        });

        // New codes replace them all, and need the password.
        const renewed = yield* bodyOf(
          Schema.Struct({ backupCodes: Schema.Array(Schema.String) }),
          yield* app.request("/api/auth/two-factor/generate-backup-codes", {
            body: { password },
            headers: { cookie: session },
          })
        );

        assert.lengthOf(renewed.backupCodes, 10);
        assert.strictEqual(
          (yield* statusOf({ cookie: session })).recoveryCodesLeft,
          10
        );

        const old = yield* secondStep(
          withCookies("", yield* passwordStep(person.email)),
          { code: backupCodes[1] ?? "", route: "verify-backup-code" }
        );

        assert.strictEqual(codeOfReply(old), "INVALID_BACKUP_CODE");

        // An application acting for the person reads whether it is on,
        // not how many codes are left; an API key reads nothing.
        const token = yield* commandLineToken(session);

        assert.deepStrictEqual(
          yield* statusOf({ authorization: `Bearer ${token}` }),
          { enabled: true, recoveryCodesLeft: null, requiredBy: [] }
        );

        const workspaceId = yield* workspaceOf(
          { ...person, cookies: session },
          "Recovery"
        );

        const { key } = yield* apiKeyOf(
          { ...person, cookies: session },
          workspaceId,
          ["post:read"]
        );

        const byKey = yield* app.request("/api/me/two-step", {
          headers: { authorization: `Bearer ${key}` },
        });

        assert.strictEqual(byKey.status, 403);
      })
    );

    it.effect("emails the account each change, in its language", () =>
      Effect.gen(function* emails() {
        const app = yield* TestApp;
        const person = yield* signedUp("emails", "fr");
        const { backupCodes, cookies } = yield* enrolled(person);

        yield* emailTo(
          person.email,
          /^La validation en deux étapes est activée/u
        );

        yield* signedOut(person);

        const browser = withCookies("", yield* passwordStep(person.email));

        const used = yield* secondStep(browser, {
          code: backupCodes[0] ?? "",
          route: "verify-backup-code",
        });

        const session = withCookies(browser, used);

        const told = yield* emailTo(
          person.email,
          /^Un code de secours a servi/u
        );

        assert.include(told.Text, "Il vous reste 9 codes de secours.");

        yield* app.request("/api/auth/two-factor/generate-backup-codes", {
          body: { password },
          headers: { cookie: session },
        });

        yield* emailTo(person.email, /^Nouveaux codes de secours/u);

        const off = yield* app.request("/api/auth/two-factor/disable", {
          body: { password },
          headers: { cookie: session },
        });

        assert.strictEqual(off.status, 200);

        yield* emailTo(
          person.email,
          /^La validation en deux étapes est désactivée/u
        );

        // A refused change tells nothing: the old session was replaced.
        const refused = yield* app.request("/api/auth/two-factor/disable", {
          body: { password },
          headers: { cookie: cookies },
        });

        assert.strictEqual(refused.status, 401);
      })
    );

    it.effect("does not ask a browser trusted for 30 days", () =>
      Effect.gen(function* trusted() {
        const sql = yield* SqlClient.SqlClient;
        const person = yield* signedUp("trusted");
        const { key } = yield* enrolled(person);

        yield* signedOut(person);

        const browser = withCookies("", yield* passwordStep(person.email));

        const verified = yield* secondStep(browser, {
          code: yield* now(key),
          route: "verify-totp",
          trustDevice: true,
        });

        assert.strictEqual(verified.status, 200);

        const kept = withCookies(browser, verified);

        // The library's record of the trusted browser, which a staff
        // reset deletes by this prefix.
        const records =
          yield* sql`SELECT identifier FROM auth.verification WHERE value = ${person.id} AND identifier LIKE 'trust-device-%'`.pipe(
            Effect.orDie
          );

        assert.lengthOf(records, 1);

        const trustedSignIn = yield* passwordStep(person.email, {
          cookies: kept,
        });

        assert.strictEqual(trustedSignIn.status, 200);
        assert.notProperty(trustedSignIn.body, "twoFactorRedirect");

        const elsewhere = yield* passwordStep(person.email);

        yield* bodyOf(ChallengeSchema, elsewhere);
      })
    );

    it.effect(
      "forgets every browser it trusted once turned off, whichever browser turns it off",
      () =>
        Effect.gen(function* forgotten() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const person = yield* signedUp("untrusted");
          const { key } = yield* enrolled(person);

          yield* signedOut(person);

          // A browser trusted for 30 days.
          const trustedBrowser = withCookies(
            "",
            yield* passwordStep(person.email)
          );

          const trustedStep = yield* secondStep(trustedBrowser, {
            code: yield* now(key),
            route: "verify-totp",
            trustDevice: true,
          });

          const trusted = withCookies(trustedBrowser, trustedStep);

          // Another browser turns it off.
          const otherBrowser = withCookies(
            "",
            yield* passwordStep(person.email)
          );

          const otherStep = yield* secondStep(otherBrowser, {
            code: yield* now(key),
            route: "verify-totp",
          });

          const other = withCookies(otherBrowser, otherStep);

          const off = yield* app.request("/api/auth/two-factor/disable", {
            body: { password },
            headers: { cookie: other },
          });

          assert.strictEqual(off.status, 200, JSON.stringify(off.body));

          const records =
            yield* sql`SELECT identifier FROM auth.verification WHERE value = ${person.id} AND identifier LIKE 'trust-device-%'`.pipe(
              Effect.orDie
            );

          assert.lengthOf(records, 0);

          // Turned on again, the browser trusted before is asked a code.
          yield* enrolled({ ...person, cookies: withCookies(other, off) });

          const signIn = yield* passwordStep(person.email, {
            cookies: trusted,
          });

          yield* bodyOf(ChallengeSchema, signIn);
        })
    );

    it.effect(
      "resumes an MCP client's authorization after the second step only",
      () =>
        Effect.gen(function* authorization() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const person = yield* signedUp("oauth");
          const { key } = yield* enrolled(person);

          yield* workspaceOf(person, "Agents");
          yield* signedOut(person);

          const clientId = yield* registeredClient;

          const query = new URLSearchParams({
            client_id: clientId,
            code_challenge: "synthetic-challenge-0123456789abcdefghijklmnopq",
            code_challenge_method: "S256",
            redirect_uri: "http://127.0.0.1:33418/callback",
            resource: `${origin}/api/mcp`,
            response_type: "code",
            scope: "openid workspace:read",
            state: "two-step",
          });

          const authorize = yield* app.request(
            `/api/auth/oauth2/authorize?${query.toString()}`
          );

          assert.strictEqual(authorize.status, 302);

          const signInPage = new URL(
            authorize.headers.get("location") ?? "",
            origin
          );

          assert.strictEqual(signInPage.pathname, "/sign-in");

          const oauthQuery = signInPage.search.slice(1);

          const challenged = yield* passwordStep(person.email, { oauthQuery });

          assert.strictEqual(challenged.status, 200);
          yield* bodyOf(ChallengeSchema, challenged);
          assert.notProperty(challenged.body, "redirect");
          assert.strictEqual(yield* sessionsOf(person.id), 0);

          const codes =
            yield* sql`SELECT id FROM auth.verification WHERE value LIKE ${`%"userId":"${person.id}"%`}`.pipe(
              Effect.orDie
            );

          assert.lengthOf(codes, 0);

          const verified = yield* secondStep(withCookies("", challenged), {
            code: yield* now(key),
            oauthQuery,
            route: "verify-totp",
          });

          assert.strictEqual(verified.status, 200);

          // The authorization goes on where a sign-in without the second
          // step takes it: the workspace picker.
          const resumed = yield* bodyOf(
            Schema.Struct({
              redirect: Schema.Literal(true),
              url: Schema.String,
            }),
            verified
          );

          assert.strictEqual(
            new URL(resumed.url, origin).pathname,
            "/oauth/workspace"
          );
        })
    );

    it.effect(
      "approves the command line's device code from a session made with a code",
      () =>
        Effect.gen(function* deviceGrant() {
          const app = yield* TestApp;
          const oauth = yield* OAuth;
          const person = yield* signedUp("device");
          const { key } = yield* enrolled(person);

          yield* signedOut(person);

          const cookies = yield* signInWithCode(person.email, key);

          const device = yield* oauth.tokens.deviceAuthorization({
            payload: {
              client_id: "peal-cli",
              resource: `${origin}/api`,
              scope: "offline_access workspace:read",
            },
          });

          const typed = `${device.user_code.slice(0, 4)}-${device.user_code.slice(4)}`;

          const reviewed = yield* app.request(
            `/api/auth/device?user_code=${typed}`,
            { headers: { cookie: cookies } }
          );

          assert.strictEqual(reviewed.status, 200);

          const approved = yield* app.request("/api/auth/device/approve", {
            body: { userCode: device.user_code },
            headers: { cookie: cookies },
          });

          assert.strictEqual(approved.status, 200);

          const tokens = yield* oauth.tokens.token({
            payload: {
              client_id: "peal-cli",
              device_code: device.device_code,
              grant_type: deviceCodeGrantType,
            },
          });

          const me = yield* app.request("/api/me", {
            headers: { authorization: `Bearer ${tokens.access_token}` },
          });

          assert.strictEqual(me.status, 200);
        })
    );
  }
);
