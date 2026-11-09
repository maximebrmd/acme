import { HttpApiMiddleware, HttpApiSecurity, OpenApi } from "effect/http-api";

import type { CurrentPrincipal } from "./current-principal.ts";
import { Forbidden } from "./forbidden.ts";
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
    // Over HTTPS the cookie is __Secure-acme.session_token; the server reads
    // the Cookie header itself, so plain HTTP in development works too.
    session: HttpApiSecurity.apiKey({
      in: "cookie",
      key: "__Secure-acme.session_token",
    }).pipe(
      HttpApiSecurity.annotate(
        OpenApi.Description,
        "The session cookie the web app's sign-in sets. Requests that change something must come from the web app's origin."
      )
    ),
  },
}) {}
