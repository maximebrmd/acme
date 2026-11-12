import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** This server cannot keep a workspace's image provider key. */
export class AssistantSecretsNotConfigured extends Schema.TaggedError<AssistantSecretsNotConfigured>()(
  "AssistantSecretsNotConfigured",
  { ...errorEnvelope },
  {
    description:
      "This server cannot keep a workspace's image provider key: its operator has not set the keys that encrypt them (`PEAL_TOKEN_KEYS`). Nothing was saved.",
    httpApiStatus: 503,
  }
) {}
