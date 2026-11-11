// What tests of two-step verification share: turning it on for a person
// through Better Auth's routes, the codes their authenticator app would
// show, and signing in with them. Every secret is the one the library
// generates in the test: none is written here.
import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { assert } from "@effect/vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Effect, Option, Redacted, Schema } from "effect";

import { lookupKeysOf } from "#shared/infrastructure/stripe-settings.ts";
import {
  bodyOf,
  origin,
  password,
  signedUp,
  TestApp,
} from "#test/workspace/integration/harness.ts";
import type { Person, Reply } from "#test/workspace/integration/harness.ts";
import { makeAuth } from "#workspace/infrastructure/auth/options.ts";

/** The cookies a browser holds after a reply that may set or expire some. */
export const withCookies = (cookies: string, reply: Reply): string => {
  const jar = new Map(
    cookies
      .split("; ")
      .filter((cookie) => cookie !== "")
      .map((cookie) => [cookie.split("=")[0] ?? "", cookie])
  );

  for (const header of reply.headers.getSetCookie()) {
    const pair = header.split(";")[0] ?? "";
    const name = pair.split("=")[0] ?? "";
    const expired = pair.endsWith("=") || /max-age=0(?:;|$)/iu.test(header);

    if (expired) {
      jar.delete(name);
    } else {
      jar.set(name, pair);
    }
  }

  return [...jar.values()].join("; ");
};

const EnabledSchema = Schema.Struct({
  backupCodes: Schema.Array(Schema.String),
  totpURI: Schema.String,
});

/** The authenticator's key, as the app reads it from the QR code. */
export const keyOf = (totpURI: string): Uint8Array =>
  base32.decode(new URL(totpURI).searchParams.get("secret") ?? "");

/** The code the authenticator app shows now. */
export const codeOf = async (key: Uint8Array): Promise<string> =>
  await createOTP(key).totp();

/**
 * A code the authenticator app shows in none of the periods the library
 * accepts (the one before, now and the one after).
 */
export const wrongCodeOf = async (key: Uint8Array): Promise<string> => {
  const counter = Math.floor(Date.now() / 30_000);
  const otp = createOTP(key);

  const accepted = new Set(
    await Promise.all(
      [-1, 0, 1, 2].map(async (step) => await otp.hotp(counter + step))
    )
  );

  for (let candidate = 0; ; candidate += 1) {
    const code = String(candidate).padStart(6, "0");

    if (!accepted.has(code)) {
      return code;
    }
  }
};

export interface Enrolment {
  readonly backupCodes: readonly string[];
  /** The browser's cookies once the first code was accepted. */
  readonly cookies: string;
  readonly key: Uint8Array;
  readonly totpURI: string;
}

/** Asks to turn two-step verification on: the URI and the recovery codes. */
export const enable = Effect.fn("enable")(function* enable(person: Person) {
  const app = yield* TestApp;

  const reply = yield* app.request("/api/auth/two-factor/enable", {
    body: { password },
    headers: { cookie: person.cookies },
  });

  assert.strictEqual(reply.status, 200, JSON.stringify(reply.body));

  return yield* bodyOf(EnabledSchema, reply);
});

/** Turns two-step verification on, with the first code from the app. */
export const enrolled = Effect.fn("enrolled")(function* enrolled(
  person: Person
) {
  const app = yield* TestApp;
  const { backupCodes, totpURI } = yield* enable(person);
  const key = keyOf(totpURI);
  const code = yield* Effect.promise(async () => await codeOf(key));

  const verified = yield* app.request("/api/auth/two-factor/verify-totp", {
    body: { code },
    headers: { cookie: person.cookies },
  });

  assert.strictEqual(verified.status, 200, JSON.stringify(verified.body));

  const enrolment: Enrolment = {
    backupCodes,
    cookies: withCookies(person.cookies, verified),
    key,
    totpURI,
  };

  return enrolment;
});

// What the sign-in and the second step send: the signed query of an OAuth
// authorization in progress, as the web app sends it, only when there is
// one.
interface SignInBody {
  email: string;
  oauth_query?: string;
  password: string;
}

interface VerifyBody {
  code: string;
  oauth_query?: string;
  trustDevice?: boolean;
}

/** The password step of a sign-in, with what the browser already holds. */
export const passwordStep = Effect.fn("passwordStep")(function* passwordStep(
  email: string,
  options: {
    readonly cookies?: string;
    readonly oauthQuery?: string;
  } = {}
) {
  const app = yield* TestApp;
  const body: SignInBody = { email, password };

  if (options.oauthQuery !== undefined) {
    body.oauth_query = options.oauthQuery;
  }

  return yield* app.request("/api/auth/sign-in/email", {
    body,
    headers: Object.fromEntries(
      options.cookies === undefined ? [] : [["cookie", options.cookies]]
    ),
  });
});

/** The second step of a sign-in: a code from the app, or a recovery code. */
export const secondStep = Effect.fn("secondStep")(function* secondStep(
  cookies: string,
  step: {
    readonly code: string;
    readonly oauthQuery?: string;
    readonly route: "verify-backup-code" | "verify-totp";
    readonly trustDevice?: boolean;
  }
) {
  const app = yield* TestApp;
  const body: VerifyBody = { code: step.code };

  if (step.trustDevice !== undefined) {
    body.trustDevice = step.trustDevice;
  }

  if (step.oauthQuery !== undefined) {
    body.oauth_query = step.oauthQuery;
  }

  return yield* app.request(`/api/auth/two-factor/${step.route}`, {
    body,
    headers: { cookie: cookies },
  });
});

/** Signs in with the password and a code from the app: the new cookies. */
export const signInWithCode = Effect.fn("signInWithCode")(
  function* signInWithCode(email: string, key: Uint8Array) {
    const challenged = yield* passwordStep(email);
    const code = yield* Effect.promise(async () => await codeOf(key));

    const verified = yield* secondStep(withCookies("", challenged), {
      code,
      route: "verify-totp",
    });

    assert.strictEqual(verified.status, 200, JSON.stringify(verified.body));

    return withCookies(withCookies("", challenged), verified);
  }
);

const ignore = () => {
  // An instance that serves no request sends and logs nothing.
};

const nothing = async (): Promise<void> => {
  await Promise.resolve();
};

/**
 * The Better Auth instance the server runs, with billing on, built on no
 * database: for tests that read its plugins and routes, never for one that
 * sends it a request.
 */
export const authWithoutDatabase = () =>
  makeAuth({
    database: { db: drizzle.mock(), tables: {} },
    hooks: {
      checkout: async () =>
        await Promise.resolve({ _tag: "start", trialDays: null } as const),
      freeWorkspace: async () => await Promise.resolve(null),
      impersonatedRequest: async () => await Promise.resolve(true),
      invitation: ignore,
      log: ignore,
      memberAllowance: async () => await Promise.resolve(Option.none()),
      memberUpgrade: async () =>
        await Promise.resolve({
          billingUrl: "http://localhost:3001",
          plan: "free" as const,
          planWithRoom: null,
        }),
      resetPassword: ignore,
      subscriptionChanged: nothing,
      verifyEmail: ignore,
      workspaceChange: nothing,
    },
    settings: {
      captcha: Option.none(),
      databasePoolMax: 1,
      dynamicClientRegistration: true,
      ipAddressHeaders: ["x-forwarded-for"],
      production: false,
      publicUrl: "http://localhost:3001",
      requireEmailVerification: true,
      secret: Redacted.make("synthetic-auth-secret-for-tests-0123456789"),
      stripe: Option.some({
        apiUrl: Option.none(),
        prices: lookupKeysOf("synthetic"),
        secretKey: Redacted.make("sk_test_synthetic_routes"),
        webhookSecret: Redacted.make("whsec_synthetic_routes"),
      }),
      trustedOrigins: [],
      trustedProxies: [],
    },
  });

/**
 * Every path the instance serves over HTTP: the server-only endpoints have
 * none.
 */
export const servedRoutes = (
  auth: ReturnType<typeof authWithoutDatabase>
): readonly string[] =>
  Object.values(auth.api).flatMap(({ path }: { readonly path?: string }) =>
    path === undefined ? [] : [path]
  );

const SentInvitationSchema = Schema.Struct({ id: Schema.String });

/** Someone the owner invites, who signs up, confirms and joins as `role`. */
export const joined = Effect.fn("joined")(function* joined(
  owner: Person,
  workspaceId: string,
  label: string,
  role: string
) {
  const app = yield* TestApp;
  const person = yield* signedUp(label);

  const sent = yield* bodyOf(
    SentInvitationSchema,
    yield* app.request(`/api/workspaces/${workspaceId}/invitations`, {
      body: { email: person.email, role },
      headers: { cookie: owner.cookies },
    })
  );

  const accepted = yield* app.request(
    "/api/auth/organization/accept-invitation",
    { body: { invitationId: sent.id }, headers: { cookie: person.cookies } }
  );

  assert.strictEqual(accepted.status, 200, JSON.stringify(accepted.body));

  return person;
});

const DeviceCodeSchema = Schema.Struct({
  device_code: Schema.String,
  user_code: Schema.String,
});

const TokensSchema = Schema.Struct({ access_token: Schema.String });

/**
 * An access token of Peal's command line, which the person signed in with
 * the device grant from a browser holding these cookies.
 */
export const commandLineToken = Effect.fn("commandLineToken")(
  function* commandLineToken(cookies: string) {
    const app = yield* TestApp;

    const device = yield* bodyOf(
      DeviceCodeSchema,
      yield* app.request("/api/auth/device/code", {
        form: {
          client_id: "peal-cli",
          resource: `${origin}/api`,
          scope:
            "offline_access workspace:read workspace:write workspace:publish",
        },
      })
    );

    // The browser opens the device page, which claims the code.
    const reviewed = yield* app.request(
      `/api/auth/device?user_code=${device.user_code}`,
      { headers: { cookie: cookies } }
    );

    assert.strictEqual(reviewed.status, 200, JSON.stringify(reviewed.body));

    const approved = yield* app.request("/api/auth/device/approve", {
      body: { userCode: device.user_code },
      headers: { cookie: cookies },
    });

    assert.strictEqual(approved.status, 200, JSON.stringify(approved.body));

    const tokens = yield* bodyOf(
      TokensSchema,
      yield* app.request("/api/auth/oauth2/token", {
        form: {
          client_id: "peal-cli",
          device_code: device.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        },
      })
    );

    return tokens.access_token;
  }
);
