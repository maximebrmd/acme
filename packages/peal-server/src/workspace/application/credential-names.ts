import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What the API keys of workspaces and the OAuth clients acting for members
 * are called, for the contexts that record which one did something. A key
 * is named by its creator, a client by itself when it registered: neither
 * is a secret.
 */
export class CredentialNames extends Context.Service<
  CredentialNames,
  {
    /** The name of the workspace's API key, if it has the key, named. */
    readonly apiKey: (
      workspaceId: WorkspaceId,
      apiKeyId: string
    ) => Effect.Effect<Option.Option<string>, DatabaseError>;
    /** The name the OAuth client registered with, if it gave one. */
    readonly application: (
      clientId: string
    ) => Effect.Effect<Option.Option<string>, DatabaseError>;
  }
>()("peal-server/workspace/application/CredentialNames") {}
