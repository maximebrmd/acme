import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api";

// Top-level, so the client calls it as `client.health()`.
export class SystemApi extends HttpApiGroup.make("system", {
  topLevel: true,
}).add(
  HttpApiEndpoint.get("health", "/health", {
    success: HttpApiSchema.NoContent,
  })
) {}
