import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { ApiKeyNotFound } from "./api-key-not-found.ts";
import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { PermissionSchema } from "./permission.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** An API key as listed: never the key itself, which is shown once. */
export const ApiKeySchema = Schema.Struct({
  createdAt: Schema.DateTimeUtc,
  expiresAt: Schema.NullOr(Schema.DateTimeUtc),
  id: Schema.String,
  name: Schema.String,
  permissions: Schema.Array(PermissionSchema),
  // The key's first characters, prefix included, to tell keys apart.
  start: Schema.NullOr(Schema.String),
}).annotate({ identifier: "ApiKey" });

export type ApiKey = typeof ApiKeySchema.Type;

export const NewApiKeySchema = Schema.Struct({
  // Days until the key stops working; without it, it works until revoked.
  expiresInDays: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ maximum: 365, minimum: 1 }))
  ),
  name: Schema.String.check(Schema.isBetweenLength(1, 32)),
  // At most what the member creating it may do.
  permissions: Schema.NonEmptyArray(PermissionSchema),
}).annotate({ identifier: "NewApiKey" });

export type NewApiKey = typeof NewApiKeySchema.Type;

export const CreatedApiKeySchema = Schema.Struct({
  apiKey: ApiKeySchema,
  // The secret, shown this once: send it as `Authorization: Bearer <key>`.
  key: Schema.String,
}).annotate({ identifier: "CreatedApiKey" });

const workspace = { workspaceId: Schema.String };

/** A workspace's API keys, for scripts and integrations. */
export class ApiKeysApi extends HttpApiGroup.make("apiKeys")
  .add(
    HttpApiEndpoint.post("create", "/", {
      error: Forbidden,
      params: workspace,
      payload: NewApiKeySchema,
      success: CreatedApiKeySchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Creates an API key for the workspace with some of the caller's permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.",
        summary: "Create an API key",
      })
    ),
    HttpApiEndpoint.get("list", "/", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(ApiKeySchema),
    }).annotateMerge(
      OpenApi.annotations({
        description: "Lists the workspace's API keys. Needs apiKey:read.",
        summary: "List API keys",
      })
    ),
    HttpApiEndpoint.delete("revoke", "/:apiKeyId", {
      error: [Forbidden, ApiKeyNotFound],
      params: { ...workspace, apiKeyId: Schema.String },
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.",
        summary: "Revoke an API key",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/api-keys") {}
