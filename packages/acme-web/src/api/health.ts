import { AsyncResult } from "effect/reactivity";

import { AcmeApi } from "#api/client.ts";

// The server's health check. The serialization key lets the server render the
// result and the browser hydrate it.
export const health = AcmeApi.query("system", "health", {
  serializationKey: "health",
});

export type ApiStatus = "loading" | "healthy" | "unreachable";

// Any failure means the app cannot use the API: a refused connection, a proxy
// error or an unexpected answer.
export const apiStatus: (
  result: AsyncResult.AsyncResult<void, unknown>
) => ApiStatus = AsyncResult.match({
  onFailure: () => "unreachable",
  onInitial: () => "loading",
  onSuccess: () => "healthy",
});
