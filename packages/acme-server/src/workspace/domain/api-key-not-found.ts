import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/** The workspace has no API key with this id. */
export class ApiKeyNotFound extends Schema.TaggedError<ApiKeyNotFound>()(
  "ApiKeyNotFound",
  { apiKeyId: Schema.String, workspaceId: WorkspaceIdSchema }
) {}
