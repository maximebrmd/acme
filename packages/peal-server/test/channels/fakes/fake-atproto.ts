import { createHash } from "node:crypto";

import { Effect } from "effect";

import { fakeHttpServer, formOf, json } from "./fake-http-server.ts";
import type { FakeRequest, FakeResponse } from "./fake-http-server.ts";

/** A synthetic Bluesky account: its DID, handle and profile. */
export const blueskyAccount = {
  avatar: "https://cdn.social.example/avatars/bob.jpg",
  did: "did:plc:abcdefghijklmnopqrstuvwx",
  displayName: "Bob Example",
  handle: "bob.test",
} as const;

const scope = "atproto transition:generic";

/**
 * How the fake answers once the account is connected: `rotate` refreshes,
 * `refuse` turns the refresh token down, `fail` breaks the token endpoint,
 * and `directoryDown` and `metadataDown` break the PLC directory or the
 * authorization server's metadata, which a refresh reads first.
 */
export type RefreshBehaviour =
  | "rotate"
  | "refuse"
  | "fail"
  | "directoryDown"
  | "metadataDown";

const unavailable = json({ error: "Service Unavailable" }, 503);

interface Grant {
  readonly challenge: string;
  readonly state: string;
}

const base64Url = (bytes: Buffer) => bytes.toString("base64url");

const sha256 = (text: string) =>
  base64Url(createHash("sha256").update(text).digest());

/**
 * One server playing every AT Protocol part a sign-in touches: the handle
 * resolver, the PLC directory, the PDS (protected resource) and its
 * authorization server (PAR, token and revocation endpoints), and the app
 * view. DPoP proofs and client assertions are accepted as sent: the fake
 * checks the flow, not the cryptography.
 */
export const fakeAtproto = Effect.fnUntraced(function* fakeAtproto() {
  const requests = new Map<string, Grant>();
  const codes = new Map<string, Grant>();
  const refreshTokens = new Set<string>();
  let issued = 0;
  let behaviour: RefreshBehaviour = "rotate";

  const tokens = () => {
    issued += 1;

    const refreshToken = `refresh-${issued}`;

    refreshTokens.add(refreshToken);

    return json({
      access_token: `access-${issued}`,
      expires_in: 3600,
      refresh_token: refreshToken,
      scope,
      sub: blueskyAccount.did,
      token_type: "DPoP",
    });
  };

  const token = (request: FakeRequest): FakeResponse => {
    const form = formOf(request);

    if (form.get("grant_type") === "authorization_code") {
      const grant = codes.get(form.get("code") ?? "");

      if (
        grant === undefined ||
        grant.challenge !== sha256(form.get("code_verifier") ?? "")
      ) {
        return json({ error: "invalid_grant" }, 400);
      }

      codes.delete(form.get("code") ?? "");

      return tokens();
    }

    if (behaviour === "fail") {
      return json({ error: "server_error" }, 503);
    }

    const presented = form.get("refresh_token") ?? "";

    if (behaviour === "refuse" || !refreshTokens.delete(presented)) {
      return json(
        { error: "invalid_grant", error_description: "Invalid refresh token" },
        400
      );
    }

    return tokens();
  };

  const handle = (request: FakeRequest, origin: string): FakeResponse => {
    const route = `${request.method} ${request.path}`;

    switch (route) {
      case "GET /xrpc/com.atproto.identity.resolveHandle": {
        return request.query.get("handle") === blueskyAccount.handle
          ? json({ did: blueskyAccount.did })
          : json(
              { error: "InvalidRequest", message: "Unable to resolve" },
              400
            );
      }

      case `GET /${blueskyAccount.did}`: {
        if (behaviour === "directoryDown") {
          return unavailable;
        }

        return json({
          "@context": ["https://www.w3.org/ns/did/v1"],
          alsoKnownAs: [`at://${blueskyAccount.handle}`],
          id: blueskyAccount.did,
          service: [
            {
              id: "#atproto_pds",
              serviceEndpoint: origin,
              type: "AtprotoPersonalDataServer",
            },
          ],
        });
      }

      case "GET /.well-known/oauth-protected-resource": {
        return json({ authorization_servers: [origin], resource: origin });
      }

      case "GET /.well-known/oauth-authorization-server": {
        if (behaviour === "metadataDown") {
          return unavailable;
        }

        return json({
          authorization_endpoint: `${origin}/oauth/authorize`,
          authorization_response_iss_parameter_supported: true,
          client_id_metadata_document_supported: true,
          code_challenge_methods_supported: ["S256"],
          dpop_signing_alg_values_supported: ["ES256"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          issuer: origin,
          protected_resources: [origin],
          pushed_authorization_request_endpoint: `${origin}/oauth/par`,
          require_pushed_authorization_requests: true,
          response_types_supported: ["code"],
          revocation_endpoint: `${origin}/oauth/revoke`,
          scopes_supported: ["atproto", "transition:generic"],
          token_endpoint: `${origin}/oauth/token`,
          token_endpoint_auth_methods_supported: ["none", "private_key_jwt"],
          token_endpoint_auth_signing_alg_values_supported: ["ES256"],
        });
      }

      case "POST /oauth/par": {
        const form = formOf(request);
        const requestUri = `urn:ietf:params:oauth:request_uri:req-${requests.size + 1}`;

        requests.set(requestUri, {
          challenge: form.get("code_challenge") ?? "",
          state: form.get("state") ?? "",
        });

        return json({ expires_in: 299, request_uri: requestUri }, 201);
      }

      case "POST /oauth/token": {
        return token(request);
      }

      case "POST /oauth/revoke": {
        return { status: 200 };
      }

      case "GET /xrpc/app.bsky.actor.getProfile": {
        return json({
          avatar: blueskyAccount.avatar,
          did: blueskyAccount.did,
          displayName: blueskyAccount.displayName,
          handle: blueskyAccount.handle,
        });
      }

      default: {
        return json({ error: "NotFound" }, 404);
      }
    }
  };

  const server = yield* fakeHttpServer(handle);

  /**
   * The member approves on the authorization page: the server sends the
   * browser back with a code, the state and the issuer.
   */
  const approve = (authorizationUrl: string) => {
    const requestUri =
      new URL(authorizationUrl).searchParams.get("request_uri") ?? "";

    const grant = requests.get(requestUri);

    if (grant === undefined) {
      throw new Error(`No pushed request ${requestUri}`);
    }

    const code = `code-${codes.size + 1}`;

    codes.set(code, grant);

    return { code, iss: server.url, state: grant.state };
  };

  return {
    ...server,
    approve,
    /** How later refresh requests are answered. */
    refreshWith: (next: RefreshBehaviour) => {
      behaviour = next;
    },
  };
});
