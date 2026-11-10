import { Effect } from "effect";

import type { LinkedInEndpoints } from "#channels/infrastructure/platforms/linkedin/linkedin-authorizer.ts";

import { fakeHttpServer, formOf, json } from "./fake-http-server.ts";
import type {
  FakeRequest,
  FakeResponse,
  JsonValue,
} from "./fake-http-server.ts";

/** Peal's synthetic LinkedIn app. */
export const linkedinClient = {
  clientId: "77synthetic",
  clientSecret: "synthetic-linkedin-secret",
} as const;

/**
 * Peal's second synthetic app, with the Community Management API alone, as
 * LinkedIn grants it: the one that connects pages.
 */
export const linkedinPagesClient = {
  clientId: "88synthetic-pages",
  clientSecret: "synthetic-linkedin-pages-secret",
} as const;

/** The scopes the Community Management API app is asked for. */
const pagesScopes =
  "r_organization_social,rw_organization_admin,w_organization_social";

/** The version of the API the fake serves, and one LinkedIn retired. */
export const linkedinFakeVersion = "202610";
export const linkedinRetiredVersion = "202401";

/** A company page. */
export interface LinkedInOrganization {
  readonly id: number;
  readonly localizedName: string;
  readonly vanityName?: string;
}

/** A member's role on a page, as the access control API lists it. */
export interface LinkedInRole {
  readonly organization: number;
  readonly role: string;
  readonly state: string;
}

/** Synthetic pages. */
export const linkedinPage: LinkedInOrganization = {
  id: 9_000_000_001,
  localizedName: "Example Bakery",
  vanityName: "example-bakery",
};

export const otherLinkedinPage: LinkedInOrganization = {
  id: 9_000_000_002,
  localizedName: "Example Bikes",
  vanityName: "example-bikes",
};

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
  readonly client: string;
  readonly member: string;
  readonly redirectUri: string;
}

interface IssuedToken {
  readonly member: string;
  readonly pages: boolean;
}

const secrets = new Map<string, string>([
  [linkedinClient.clientId, linkedinClient.clientSecret],
  [linkedinPagesClient.clientId, linkedinPagesClient.clientSecret],
]);

// The versioned API refuses a call without its headers, or in a version it
// retired, before anything else (LinkedIn's error responses).
const versionRefusal = (request: FakeRequest): FakeResponse | undefined => {
  const version = request.headers["linkedin-version"];

  if (version === undefined) {
    return json(
      {
        code: "VERSION_MISSING",
        message:
          "A version must be present. Please specify a version by adding the Linkedin-Version header.",
        status: 400,
      },
      400
    );
  }

  if (version !== linkedinFakeVersion) {
    return json(
      {
        code: "NONEXISTENT_VERSION",
        message: `Requested version ${String(version)} is not active`,
        status: 426,
      },
      426
    );
  }

  return request.headers["x-restli-protocol-version"] === "2.0.0"
    ? undefined
    : json({ message: "Invalid Rest.li protocol version", status: 400 }, 400);
};

const forbidden = json(
  { code: "ACCESS_DENIED", message: "Not enough permissions", status: 403 },
  403
);

/**
 * LinkedIn's sign-in and OpenID Connect profile for synthetic members: it
 * issues codes for the authorization page (`approve` plays the member),
 * exchanges them with the client's secret, and answers userinfo for the
 * tokens it issued. `failNext` makes the next answer to a route a failure.
 */
export const fakeLinkedIn = Effect.fnUntraced(function* fakeLinkedIn() {
  const codes = new Map<string, PendingCode>();
  const tokens = new Map<string, IssuedToken>();
  const refreshTokens = new Map<string, IssuedToken>();
  const roles = new Map<string, LinkedInRole[]>();

  const organizations = new Map<number, LinkedInOrganization>([
    [linkedinPage.id, linkedinPage],
    [otherLinkedinPage.id, otherLinkedinPage],
  ]);

  let refreshable = false;

  const members = new Map<string, LinkedInMember>([
    [linkedinMember.sub, linkedinMember],
  ]);

  const failures = new Map<string, FakeResponse[]>();

  // Codes and refresh tokens, exchanged with the client's secret.
  const exchange = (request: FakeRequest): FakeResponse => {
    const form = formOf(request);
    const code = codes.get(form.get("code") ?? "");

    const client = form.get("client_id") ?? "";

    if (
      !secrets.has(client) ||
      form.get("client_secret") !== secrets.get(client)
    ) {
      return json({ error: "invalid_client" }, 401);
    }

    // Programmatic refresh tokens: a new access token, and the same
    // refresh token, whose year does not start over.
    if (form.get("grant_type") === "refresh_token") {
      const refreshToken = form.get("refresh_token") ?? "";
      const granted = refreshTokens.get(refreshToken);

      if (granted === undefined || client !== linkedinPagesClient.clientId) {
        return json(
          {
            error: "invalid_request",
            error_description: "The provided refresh token is invalid",
          },
          400
        );
      }

      const renewed = `linkedin-token-${tokens.size + 1}`;

      tokens.set(renewed, granted);

      return json({
        access_token: renewed,
        expires_in: sixtyDays,
        refresh_token: refreshToken,
        refresh_token_expires_in: 30_000_000,
        scope: pagesScopes,
      });
    }

    if (
      form.get("grant_type") !== "authorization_code" ||
      code === undefined ||
      code.client !== client ||
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

    const pages = client === linkedinPagesClient.clientId;

    tokens.set(token, { member: code.member, pages });

    if (pages) {
      const refreshToken = `linkedin-refresh-${refreshTokens.size + 1}`;

      if (refreshable) {
        refreshTokens.set(refreshToken, { member: code.member, pages });
      }

      const answer = {
        access_token: token,
        expires_in: sixtyDays,
        scope: pagesScopes,
      };

      return json(
        refreshable
          ? {
              ...answer,
              refresh_token: refreshToken,
              refresh_token_expires_in: 31_536_000,
            }
          : answer
      );
    }

    return json({
      access_token: token,
      expires_in: sixtyDays,
      id_token: "synthetic.id.token",
      scope: "openid,profile,w_member_social",
      token_type: "Bearer",
    });
  };

  // A page's own fields, its administrators' to read, or the fields anyone
  // may read, for the ids listed.
  const organizationRoute = (
    request: FakeRequest,
    held: readonly LinkedInRole[]
  ): FakeResponse => {
    const organization = /^\/rest\/organizations\/(?<id>\d+)$/u.exec(
      request.path
    );

    // A page's own fields are its administrators' to read.
    if (request.method === "GET" && organization !== null) {
      const id = Number(organization.groups?.["id"]);
      const found = organizations.get(id);

      const administers = held.some(
        (role) =>
          role.organization === id &&
          role.role === "ADMINISTRATOR" &&
          role.state === "APPROVED"
      );

      if (found === undefined) {
        return json({ message: "Not found", status: 404 }, 404);
      }

      return administers
        ? json({ ...found, primaryOrganizationType: "NONE" })
        : json(
            {
              message: `Viewer don't have permission to the ADMIN_ONLY VisibilityReduction for urn:li:organization:${id}`,
              status: 403,
            },
            403
          );
    }

    // The fields anyone may read, for the ids listed.
    if (request.path === "/rest/organizationsLookup") {
      const ids = /^List\((?<ids>[\d,]*)\)$/u.exec(
        request.query.get("ids") ?? ""
      );

      const results: Record<string, JsonValue> = {};

      for (const id of (ids?.groups?.["ids"] ?? "").split(",")) {
        const found = organizations.get(Number(id));

        if (found !== undefined) {
          results[id] = { ...found, primaryOrganizationType: "NONE" };
        }
      }

      return json({ errors: {}, results, statuses: {} });
    }

    return json({ message: "Not found", status: 404 }, 404);
  };

  // The versioned API, for the pages app's tokens.
  const restRoute = (request: FakeRequest): FakeResponse => {
    const refusal = versionRefusal(request);

    if (refusal !== undefined) {
      return refusal;
    }

    const issued = tokens.get(tokenOf(request));

    if (issued === undefined) {
      return json({ message: "Invalid access token", status: 401 }, 401);
    }

    if (!issued.pages) {
      return forbidden;
    }

    const held = roles.get(issued.member) ?? [];

    // The pages the member has a role on, a page at a time.
    if (
      `${request.method} ${request.path}` === "GET /rest/organizationAcls" &&
      request.query.get("q") === "roleAssignee"
    ) {
      const state = request.query.get("state");
      const start = Number(request.query.get("start") ?? "0");
      const count = Number(request.query.get("count") ?? "10");

      const listed = held.filter(
        (role) => state === null || role.state === state
      );

      return json({
        elements: listed.slice(start, start + count).map((role) => ({
          organization: `urn:li:organization:${role.organization}`,
          role: role.role,
          roleAssignee: `urn:li:person:${issued.member}`,
          state: role.state,
        })),
        paging: { count, links: [], start },
      });
    }

    return organizationRoute(request, held);
  };

  const handle = (request: FakeRequest): FakeResponse => {
    const route = `${request.method} ${request.path}`;
    const failure = failures.get(route)?.shift();

    if (failure !== undefined) {
      return failure;
    }

    if (route === "POST /oauth/v2/accessToken") {
      return exchange(request);
    }

    if (route === "GET /v2/userinfo") {
      const issued = tokens.get(tokenOf(request));

      // The Community Management API app has no OpenID Connect product.
      if (issued?.pages === true) {
        return forbidden;
      }

      const member = members.get(issued?.member ?? "");

      return member === undefined
        ? json({ message: "Invalid access token", status: 401 }, 401)
        : json({ ...member, locale: { country: "US", language: "en" } });
    }

    return request.path.startsWith("/rest/")
      ? restRoute(request)
      : json({ message: "Not found", status: 404 }, 404);
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
      client: url.searchParams.get("client_id") ?? "",
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
    /** Gives the member roles on pages, replacing those they had. */
    grantRoles: (member: string, granted: readonly LinkedInRole[]) => {
      roles.set(member, [...granted]);
    },
    /**
     * Makes the pages app one LinkedIn gives programmatic refresh tokens
     * to, as it does for approved partners only.
     */
    issueRefreshTokens: () => {
      refreshable = true;
    },
  };
});
