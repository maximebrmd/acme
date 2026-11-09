// Writes the OpenAPI document that peal-docs renders as the API reference.
import path from "node:path";

import { OpenApi } from "effect/http-api";

import { Api } from "../src/api.ts";

const document = OpenApi.fromApi(Api);

await Bun.write(
  path.join(import.meta.dirname, "..", "openapi.json"),
  `${JSON.stringify(document, null, 2)}\n`
);
