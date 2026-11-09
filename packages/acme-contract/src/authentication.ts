import { HttpApiMiddleware, HttpApiSecurity, OpenApi } from "effect/http-api";

import type { CurrentPrincipal } from "./current-principal.ts";
import { Forbidden } from "./forbidden.ts";
import { sessionCookie } from "./session-cookie.ts";
import { Unauthenticated } from "./unauthenticated.ts";

/**
 * Who sends the request: a bearer token (an API key), or the browser's
 * session cookie. Each is tried in turn, and a request with neither answers
 * 401. It provides CurrentPrincipal to the endpoints behind it.
 */
export class Authentication extends HttpApiMiddleware.Service<
  Authentication,
  { provides: CurrentPrincipal }
>()("acme-contract/Authentication", {
  error: [Unauthenticated, Forbidden],
  security: {
    bearer: HttpApiSecurity.bearer.pipe(
      HttpApiSecurity.annotate(
        OpenApi.Description,
        "An API key of a workspace, starting with acme_."
      )
    ),
    session: sessionCookie,
  },
}) {}
