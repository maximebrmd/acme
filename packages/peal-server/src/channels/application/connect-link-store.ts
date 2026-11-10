import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ConnectLinkId } from "#channels/domain/connect-link-id.ts";
import type {
  ConnectLink,
  LinkFailure,
} from "#channels/domain/connect-link.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The connect links of every workspace, each under the digest of its
 * token: the token itself is never kept. Reads that name a workspace only
 * find its own links.
 */
export class ConnectLinkStore extends Context.Service<
  ConnectLinkStore,
  {
    readonly insert: (
      link: ConnectLink,
      tokenDigest: string
    ) => Effect.Effect<void, DatabaseError>;
    readonly findIn: (
      workspaceId: WorkspaceId,
      linkId: ConnectLinkId
    ) => Effect.Effect<Option.Option<ConnectLink>, DatabaseError>;
    /** The workspace's links, newest first, `limit` at most. */
    readonly list: (
      workspaceId: WorkspaceId,
      limit: number
    ) => Effect.Effect<readonly ConnectLink[], DatabaseError>;
    /** The link whose token has this digest, whatever its state. */
    readonly byToken: (
      tokenDigest: string
    ) => Effect.Effect<Option.Option<ConnectLink>, DatabaseError>;
    /**
     * The link as it now stands, held until the caller's transaction ends:
     * whoever else would use it, revoke it or read it this way waits, and
     * then finds what this transaction left. Run it in a transaction.
     */
    readonly lock: (
      linkId: ConnectLinkId
    ) => Effect.Effect<Option.Option<ConnectLink>, DatabaseError>;
    /**
     * Holds the workspace's links until the caller's transaction ends, so
     * its waiting links are counted and one more made without another
     * being made in between. Run it in a transaction.
     */
    readonly holdWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** How many of the workspace's links still wait to be used at `now`. */
    readonly countWaiting: (
      workspaceId: WorkspaceId,
      now: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Keeps that a browser started the link's sign-in: its nonce's digest
     * and the count of starts. Says whether the link was still pending and
     * had starts left (`maxLinkStarts`), counted in the statement itself,
     * so starts sent together never pass it: one used, revoked or
     * exhausted meanwhile stays as it is.
     */
    readonly started: (
      link: ConnectLink
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Keeps how the link's last sign-in failed, while it is pending. */
    readonly failed: (
      linkId: ConnectLinkId,
      failure: LinkFailure
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Keeps how the link ended, used or revoked, and forgets the browser
     * that held it. Says whether it was still pending: a link ends once.
     */
    readonly ended: (
      link: ConnectLink
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Deletes the links over since `before` or earlier (used, revoked or
     * expired), and says how many.
     */
    readonly purge: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/channels/application/ConnectLinkStore") {}
