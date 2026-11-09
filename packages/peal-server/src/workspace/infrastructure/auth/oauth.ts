import { WorkspaceScopeSchema } from "#workspace/domain/oauth-grant.ts";

/**
 * The command line's OAuth client. Every Acme server has it, under the id
 * the contract gives it: a public client (it keeps no secret) that signs in
 * with the device authorization grant and renews its tokens.
 */
export { cliClientId } from "acme-contract";

/** The access token claim naming the workspace a token is bound to. */
export const workspaceClaim = "workspace_id";

/**
 * Every scope a client may ask for. The OpenID ones describe the user;
 * offline_access lets a client renew its tokens without the user.
 */
export const oauthScopes = [
  "openid",
  "profile",
  "email",
  "offline_access",
  ...WorkspaceScopeSchema.literals,
];

/** Where the OAuth issuer, Better Auth, lives under PUBLIC_URL. */
export const issuerOf = (publicUrl: string): string => `${publicUrl}/api/auth`;

/** The HTTP API, as the resource its OAuth tokens are issued for. */
export const apiResourceOf = (publicUrl: string): string => `${publicUrl}/api`;

/** The MCP endpoint, as the resource its OAuth tokens are issued for. */
export const mcpResourceOf = (publicUrl: string): string =>
  `${publicUrl}/api/mcp`;

const loopbackHostnames: ReadonlySet<string> = new Set(["localhost", "[::1]"]);

const loopbackIpv4 = /^127(?:\.\d{1,3}){3}$/u;

/**
 * Whether MCP clients can sign in to a server at `publicUrl`: over HTTPS, or
 * over plain HTTP on a loopback host, for development. Better Auth's MCP
 * plugin refuses any other MCP endpoint, as MCP clients do.
 */
export const servesMcp = (publicUrl: string): boolean => {
  const { hostname, protocol } = new URL(publicUrl);

  return (
    protocol === "https:" ||
    (protocol === "http:" &&
      (loopbackHostnames.has(hostname) || loopbackIpv4.test(hostname)))
  );
};

/**
 * The web app's pages the OAuth flows send people to, under PUBLIC_URL: to
 * sign in, pick the workspace an MCP client may use, agree to what it asks,
 * and enter the code the command line shows.
 */
export const oauthPages = {
  consent: "/oauth/consent",
  device: "/device",
  signIn: "/sign-in",
  workspace: "/oauth/workspace",
} as const;
