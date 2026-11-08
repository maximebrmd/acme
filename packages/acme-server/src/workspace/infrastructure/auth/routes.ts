import { Effect, Layer } from "effect";
import { HttpEffect, HttpRouter } from "effect/http";

import { BetterAuth } from "./better-auth.ts";
import { authBasePath } from "./options.ts";

/**
 * Better Auth's own routes, on the server's router beside the HTTP API:
 * everything under /api/auth goes to its handler as a web Request, body
 * untouched.
 */
export const AuthRoutesLive = Layer.unwrap(
  Effect.gen(function* authRoutes() {
    const auth = yield* BetterAuth;

    const handle = HttpEffect.fromWebHandler(
      async (request) => await auth.handler(request)
    ).pipe(Effect.withSpan("BetterAuth.handler"));

    return HttpRouter.add("*", `${authBasePath}/*`, handle);
  })
);
