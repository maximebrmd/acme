import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api";

import { DatabaseUnavailable } from "./database-unavailable.ts";

// Top-level, so the client calls these as `client.health()` and
// `client.ready()`.
export class SystemApi extends HttpApiGroup.make("system", {
  topLevel: true,
}).add(
  // Liveness: the process answers, whatever the state of its dependencies.
  HttpApiEndpoint.get("health", "/health", {
    success: HttpApiSchema.NoContent,
  }),
  // Readiness: the process answers and so does its database.
  HttpApiEndpoint.get("ready", "/ready", {
    error: DatabaseUnavailable,
    success: HttpApiSchema.NoContent,
  })
) {}
