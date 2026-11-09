import { Context } from "effect";
import type { Duration, Effect, Option, Redacted } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { ApiKey } from "#workspace/domain/api-key.ts";

import type { AuthUnavailable } from "./auth-unavailable.ts";

export interface ApiKeyRequest {
  /** The member creating it; Better Auth checks their role too. */
  readonly createdBy: UserId;
  readonly expiresIn: Option.Option<Duration.Duration>;
  readonly name: string;
  readonly permissions: readonly Permission[];
  readonly workspaceId: WorkspaceId;
}

export interface IssuedApiKey {
  readonly apiKey: ApiKey;
  /** The key itself, to show once. */
  readonly key: Redacted.Redacted;
}

/** Issues, lists and revokes the API keys of workspaces. */
export class ApiKeyIssuer extends Context.Service<
  ApiKeyIssuer,
  {
    readonly issue: (
      request: ApiKeyRequest
    ) => Effect.Effect<IssuedApiKey, AuthUnavailable>;
    readonly list: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly ApiKey[], AuthUnavailable>;
    /** Whether the workspace had the key, which then no longer works. */
    readonly revoke: (
      workspaceId: WorkspaceId,
      apiKeyId: string
    ) => Effect.Effect<boolean, AuthUnavailable>;
  }
>()("peal-server/workspace/application/ApiKeyIssuer") {}
