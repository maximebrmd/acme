import { HttpApiSecurity, OpenApi } from "effect/http-api";

// Over HTTPS the cookie is __Secure-peal.session_token; the server reads the
// Cookie header itself, so plain HTTP in development works too.
export const sessionCookie = HttpApiSecurity.apiKey({
  in: "cookie",
  key: "__Secure-peal.session_token",
}).pipe(
  HttpApiSecurity.annotate(
    OpenApi.Description,
    "The session cookie the web app's sign-in sets. Requests that change something must come from the web app's origin."
  )
);
