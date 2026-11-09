import { Effect, Layer } from "effect";
import { HttpEffect, HttpRouter, HttpServerResponse } from "effect/http";

import { WorkspaceScopeSchema } from "#workspace/domain/oauth-grant.ts";

import { BetterAuth } from "./better-auth.ts";
import { apiResourceOf, issuerOf } from "./oauth.ts";
import { authBasePath } from "./options.ts";
import { AuthSettings } from "./settings.ts";

// OAuth discovery, which RFC 8414 and RFC 9728 place at the root of the
// origin, with the issuer's or the resource's path appended. Better Auth
// answers these outside its base path.
const authorizationServerMetadata = `/.well-known/oauth-authorization-server${authBasePath}`;

const protectedResourceMetadata = "/.well-known/oauth-protected-resource";

/**
 * Better Auth's own routes, on the server's router beside the HTTP API:
 * everything under /api/auth goes to its handler as a web Request, body
 * untouched, and so do the discovery documents of its OAuth authorization
 * server and of the MCP endpoint. The HTTP API's own resource metadata,
 * which tells the command line what to ask a token for, is answered here.
 */
export const AuthRoutesLive = Layer.unwrap(
  Effect.gen(function* authRoutes() {
    const auth = yield* BetterAuth;
    const { publicUrl } = yield* AuthSettings;

    const handle = HttpEffect.fromWebHandler(
      async (request) => await auth.handler(request)
    ).pipe(Effect.withSpan("BetterAuth.handler"));

    // RFC 9728 protected resource metadata for the HTTP API.
    const apiResource = HttpServerResponse.jsonUnsafe(
      {
        authorization_servers: [issuerOf(publicUrl)],
        bearer_methods_supported: ["header"],
        resource: apiResourceOf(publicUrl),
        scopes_supported: WorkspaceScopeSchema.literals,
      },
      { headers: { "cache-control": "public, max-age=3600" } }
    );

    return HttpRouter.addAll([
      HttpRouter.route("*", `${authBasePath}/*`, handle),
      HttpRouter.route("*", authorizationServerMetadata, handle),
      HttpRouter.route("*", protectedResourceMetadata, handle),
      HttpRouter.route("*", `${protectedResourceMetadata}/api/mcp`, handle),
      HttpRouter.route(
        "GET",
        `${protectedResourceMetadata}/api`,
        Effect.succeed(apiResource)
      ),
    ]);
  })
);
