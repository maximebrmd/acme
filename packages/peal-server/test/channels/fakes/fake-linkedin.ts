import { Effect } from "effect";

import type { LinkedInEndpoints } from "#channels/infrastructure/platforms/linkedin/linkedin-authorizer.ts";

import { fakeHttpServer, formOf, json } from "./fake-http-server.ts";
import type { FakeRequest, FakeResponse } from "./fake-http-server.ts";

/** Peal's synthetic LinkedIn app. */
export const linkedinClient = {
  clientId: "77synthetic",
  clientSecret: "synthetic-linkedin-secret",
} as const;

/** A member, as OpenID Connect's userinfo shows them. */
export interface LinkedInMember {
  readonly family_name: string;
  readonly given_name: string;
  readonly name: string;
  readonly picture: string;
  readonly sub: string;
}

/** A synthetic member. */
export const linkedinMember: LinkedInMember = {
  family_name: "Example",
  given_name: "Alice",
  name: "Alice Example",
  picture: "https://media.licdn.example/alice.jpg",
  sub: "aB3dE5fG7h",
};

// LinkedIn's self-serve tokens last 60 days.
const sixtyDays = 5_184_000;

const tokenOf = (request: FakeRequest) =>
  String(request.headers["authorization"] ?? "").replace(/^Bearer /u, "");

/** The member cancels on LinkedIn: back with LinkedIn's own error. */
const cancel = (authorizationUrl: string) => ({
  error: "user_cancelled_authorize",
  state: new URL(authorizationUrl).searchParams.get("state") ?? "",
});

interface PendingCode {
  readonly member: string;
  readonly redirectUri: string;
}

/**
 * LinkedIn's sign-in and OpenID Connect profile for synthetic members: it
 * issues codes for the authorization page (`approve` plays the member),
 * exchanges them with the client's secret, and answers userinfo for the
 * tokens it issued. `failNext` makes the next answer to a route a failure.
 */
export const fakeLinkedIn = Effect.fnUntraced(function* fakeLinkedIn() {
  const codes = new Map<string, PendingCode>();
  const tokens = new Map<string, string>();

  const members = new Map<string, LinkedInMember>([
    [linkedinMember.sub, linkedinMember],
  ]);

  const failures = new Map<string, FakeResponse[]>();

  const handle = (request: FakeRequest): FakeResponse => {
    const route = `${request.method} ${request.path}`;
    const failure = failures.get(route)?.shift();

    if (failure !== undefined) {
      return failure;
    }

    if (route === "POST /oauth/v2/accessToken") {
      const form = formOf(request);
      const code = codes.get(form.get("code") ?? "");

      if (
        form.get("client_id") !== linkedinClient.clientId ||
        form.get("client_secret") !== linkedinClient.clientSecret
      ) {
        return json({ error: "invalid_client" }, 401);
      }

      if (
        form.get("grant_type") !== "authorization_code" ||
        code === undefined ||
        code.redirectUri !== form.get("redirect_uri")
      ) {
        return json(
          {
            error: "invalid_request",
            error_description: "Unable to retrieve access token",
          },
          400
        );
      }

      codes.delete(form.get("code") ?? "");

      const token = `linkedin-token-${tokens.size + 1}`;

      tokens.set(token, code.member);

      return json({
        access_token: token,
        expires_in: sixtyDays,
        id_token: "synthetic.id.token",
        scope: "openid,profile,w_member_social",
        token_type: "Bearer",
      });
    }

    if (route === "GET /v2/userinfo") {
      const member = members.get(tokens.get(tokenOf(request)) ?? "");

      return member === undefined
        ? json({ message: "Invalid access token", status: 401 }, 401)
        : json({ ...member, locale: { country: "US", language: "en" } });
    }

    return json({ message: "Not found", status: 404 }, 404);
  };

  const server = yield* fakeHttpServer(handle);

  const endpoints: LinkedInEndpoints = {
    api: new URL(server.url),
    authorization: new URL("/oauth/v2/authorization", server.url),
    token: new URL("/oauth/v2/accessToken", server.url),
  };

  /** The member approves on the authorization page: back with a code. */
  const approve = (
    authorizationUrl: string,
    member: string = linkedinMember.sub
  ) => {
    const url = new URL(authorizationUrl);
    const state = url.searchParams.get("state") ?? "";
    const code = `linkedin-code-${codes.size + 1}-${state.slice(0, 6)}`;

    codes.set(code, {
      member,
      redirectUri: url.searchParams.get("redirect_uri") ?? "",
    });

    return { code, state };
  };

  return {
    ...server,
    /** Another synthetic member LinkedIn knows. */
    addMember: (member: LinkedInMember) => {
      members.set(member.sub, member);
    },
    approve,
    cancel,
    endpoints,
    /** Makes the next answers to `route` these failures, in order. */
    failNext: (route: string, answers: readonly FakeResponse[]) => {
      failures.set(route, [...(failures.get(route) ?? []), ...answers]);
    },
  };
});
