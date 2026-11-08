import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { DatabaseUnavailable } from "./database-unavailable.ts";

// Top-level, so the client calls these as `client.health()` and
// `client.ready()`. Like every endpoint, under /api: the web app's origin
// sends /api/* to the server, so browsers and the CLI reach them there too.
export class SystemApi extends HttpApiGroup.make("system", {
  topLevel: true,
}).add(
  // Liveness: the process answers, whatever the state of its dependencies.
  HttpApiEndpoint.get("health", "/api/health", {
    success: HttpApiSchema.NoContent.annotate({
      description: "The server is up.",
    }),
  }).annotateMerge(
    OpenApi.annotations({
      description:
        "Answers as soon as the server is up, whatever the state of its database. Use it as a liveness or container health check.",
      summary: "Check that the server is up",
    })
  ),
  // Readiness: the process answers and so does its database.
  HttpApiEndpoint.get("ready", "/api/ready", {
    error: DatabaseUnavailable,
    success: HttpApiSchema.NoContent.annotate({
      description: "The server and its database both answer.",
    }),
  }).annotateMerge(
    OpenApi.annotations({
      description:
        "Answers once the server can reach its database, and fails with DatabaseUnavailable while it cannot. Use it as a readiness check before sending traffic.",
      summary: "Check that the server can take traffic",
    })
  )
) {}
