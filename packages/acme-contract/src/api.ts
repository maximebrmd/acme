import { HttpApi, OpenApi } from "effect/http-api";

import { SystemApi } from "./system.ts";

export { DatabaseUnavailable } from "./database-unavailable.ts";

// The one definition of the HTTP API. The server implements it; the web app,
// the CLI and the MCP server derive their typed clients from it, and the docs
// render its OpenAPI document.
export class Api extends HttpApi.make("acme")
  .add(SystemApi)
  .annotateMerge(OpenApi.annotations({ title: "Acme API" })) {}
