// Writes the OpenAPI document that peal-docs renders as the API reference:
// the API and the events it sends to webhook endpoints.
import path from "node:path";

import { openApiDocument } from "../src/openapi-document.ts";

await Bun.write(
  path.join(import.meta.dirname, "..", "openapi.json"),
  `${JSON.stringify(openApiDocument(), null, 2)}\n`
);
