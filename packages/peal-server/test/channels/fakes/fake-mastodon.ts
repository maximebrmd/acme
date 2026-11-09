import { createHash } from "node:crypto";

import { Effect, Schema } from "effect";

import { fakeHttpServer, formOf, json } from "./fake-http-server.ts";
import type { FakeRequest, FakeResponse } from "./fake-http-server.ts";

/** A synthetic account on the fake instance. */
export const mastodonAccount = {
  avatar_static: "https://files.social.example/avatars/alice.png",
  display_name: "Alice Example",
  id: "109372",
  username: "alice",
} as const;

interface PendingCode {
  readonly challenge: string;
  readonly clientId: string;
  readonly redirectUri: string;
}

export interface FakeMastodonOptions {
  /** Whether the instance is 4.3 or later, with OAuth metadata. */
  readonly modern?: boolean;
}

const isText = Schema.is(Schema.String);

const base64Url = (bytes: Buffer) => bytes.toString("base64url");

/** The member refuses on the authorization page: back with `access_denied`. */
const deny = (authorizationUrl: string) => ({
  error: "access_denied",
  state: new URL(authorizationUrl).searchParams.get("state") ?? "",
});

const decodeApp = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      redirect_uris: Schema.Unknown,
      scopes: Schema.String,
    })
  )
);

/**
 * A Mastodon instance that knows one account: it registers apps, issues
 * codes for the authorization page (`approve` plays the member), exchanges
 * them with PKCE, and answers verify_credentials for the tokens it issued.
 */
export const fakeMastodon = Effect.fnUntraced(function* fakeMastodon(
  options: FakeMastodonOptions = {}
) {
  const apps = new Map<string, { secret: string; scopes: string }>();
  const codes = new Map<string, PendingCode>();
  const tokens = new Map<string, string>();

  const handle = (request: FakeRequest, origin: string): FakeResponse => {
    const route = `${request.method} ${request.path}`;

    if (route === "GET /.well-known/oauth-authorization-server") {
      return options.modern === false
        ? { status: 404 }
        : json({
            code_challenge_methods_supported: ["S256"],
            issuer: origin,
            scopes_supported: [
              "read",
              "profile",
              "read:accounts",
              "read:statuses",
              "write:statuses",
              "write:media",
            ],
          });
    }

    if (route === "POST /api/v1/apps") {
      const { redirect_uris: redirectUris, scopes } = decodeApp(request.body);

      // Before 4.3, Mastodon took one redirect URI as a string and dropped
      // a list, then refused the app for lacking one.
      if (options.modern === false && !isText(redirectUris)) {
        return json(
          { error: "Validation failed: Redirect URI can't be blank" },
          422
        );
      }

      const id = String(apps.size + 1);

      apps.set(`client-${id}`, { scopes, secret: `secret-${id}` });

      return json({
        client_id: `client-${id}`,
        client_secret: `secret-${id}`,
        id,
        name: "Peal",
      });
    }

    if (route === "POST /oauth/token") {
      const form = formOf(request);
      const code = codes.get(form.get("code") ?? "");
      const app = apps.get(form.get("client_id") ?? "");
      const verifier = form.get("code_verifier") ?? "";

      if (
        code === undefined ||
        app === undefined ||
        app.secret !== form.get("client_secret") ||
        code.redirectUri !== form.get("redirect_uri") ||
        code.challenge !==
          base64Url(createHash("sha256").update(verifier).digest())
      ) {
        return json({ error: "invalid_grant" }, 400);
      }

      codes.delete(form.get("code") ?? "");

      const token = `token-${tokens.size + 1}`;

      tokens.set(token, mastodonAccount.id);

      return json({
        access_token: token,
        created_at: 1_781_000_000,
        scope: app.scopes,
        token_type: "Bearer",
      });
    }

    if (route === "GET /api/v1/accounts/verify_credentials") {
      const token = String(request.headers["authorization"] ?? "").replace(
        /^Bearer /u,
        ""
      );

      return tokens.has(token)
        ? json(mastodonAccount)
        : json({ error: "The access token is invalid" }, 401);
    }

    return json({ error: "Not found" }, 404);
  };

  const server = yield* fakeHttpServer(handle);

  /** The member approves on the authorization page: back with a code. */
  const approve = (authorizationUrl: string) => {
    const url = new URL(authorizationUrl);
    const state = url.searchParams.get("state") ?? "";
    const code = `code-${codes.size + 1}-${state.slice(0, 6)}`;

    codes.set(code, {
      challenge: url.searchParams.get("code_challenge") ?? "",
      clientId: url.searchParams.get("client_id") ?? "",
      redirectUri: url.searchParams.get("redirect_uri") ?? "",
    });

    return { code, state };
  };

  return {
    ...server,
    approve,
    deny,
    registeredApps: () => apps.size,
  };
});
