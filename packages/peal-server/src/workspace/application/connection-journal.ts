import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** Where a request came from, as the server received it. */
export interface RequestOrigin {
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly remoteAddress: Option.Option<string>;
}

/** A request that created, changed or deleted content, once it succeeded. */
export interface ContentChange {
  /**
   * How it authenticated: `session` (the web app), `apiKey`, `oauth` (the
   * command line or another client of the API), or `mcp`.
   */
  readonly access: "apiKey" | "mcp" | "oauth" | "session";
  readonly apiKeyId: Option.Option<string>;
  readonly origin: RequestOrigin;
  /** The account, or the staff member acting as it; none for an API key. */
  readonly userId: Option.Option<UserId>;
  readonly workspaceId: Option.Option<WorkspaceId>;
}

/**
 * The connections that create, change or delete content (posts and media),
 * which the law has a host keep a year so that their author can be
 * identified (décret n° 2021-1362, art. 5): the address and protocol, never
 * what the request carried. The legal context keeps them.
 */
export class ConnectionJournal extends Context.Service<
  ConnectionJournal,
  {
    readonly contentChanged: (
      change: ContentChange
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/workspace/application/ConnectionJournal") {}
