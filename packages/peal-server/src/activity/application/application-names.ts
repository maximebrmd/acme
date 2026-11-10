import { Context, Effect, Layer } from "effect";
import type { Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What the API key or the OAuth client behind a request is called now, for
 * the log to keep beside its id. The workspace context names them.
 */
export class ApplicationNames extends Context.Service<
  ApplicationNames,
  {
    /** The name of the workspace's API key, if it has one. */
    readonly apiKey: (
      workspaceId: WorkspaceId,
      apiKeyId: string
    ) => Effect.Effect<Option.Option<string>, DatabaseError>;
    /** The name the OAuth client registered with, if it gave one. */
    readonly client: (
      clientId: string
    ) => Effect.Effect<Option.Option<string>, DatabaseError>;
  }
>()("peal-server/activity/application/ApplicationNames") {
  /** No key or client has a name: for tests of what names are not about. */
  static readonly unnamed = Layer.succeed(
    ApplicationNames,
    ApplicationNames.of({
      apiKey: () => Effect.succeedNone,
      client: () => Effect.succeedNone,
    })
  );
}
