import { HttpApiMiddleware, HttpApiSecurity, OpenApi } from "effect/http-api";

import type { CurrentPrincipal } from "./current-principal.ts";
import { Forbidden } from "./forbidden.ts";
import { sessionCookie } from "./session-cookie.ts";
import { TooManyRequests } from "./too-many-requests.ts";
import { Unauthenticated } from "./unauthenticated.ts";

/**
 * Who sends the request: a bearer token (an API key of a workspace, a
 * partner key or an OAuth access token), or the browser's session cookie.
 * Each is tried in turn, and a request with neither answers 401. A key or a
 * token that sent too many requests answers 429. It provides
 * CurrentPrincipal to the endpoints behind it.
 */
export class Authentication extends HttpApiMiddleware.Service<
  Authentication,
  { provides: CurrentPrincipal }
>()("peal-contract/Authentication", {
  error: [Unauthenticated, Forbidden, TooManyRequests],
  security: {
    bearer: HttpApiSecurity.bearer.pipe(
      HttpApiSecurity.annotate(
        OpenApi.Description,
        "An API key of a workspace, starting with peal_, or a partner key, starting with peal_partner_."
      )
    ),
    session: sessionCookie,
  },
}) {}
