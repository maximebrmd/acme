import { Context, Schema } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { CustomerWorkspace } from "#workspace/domain/customer-workspace.ts";
import type { ExternalIdTaken } from "#workspace/domain/external-id-taken.ts";
import type { PartnerId } from "#workspace/domain/partner-id.ts";

/**
 * Where a page of a partner's workspaces ended: its last workspace's
 * creation and id. A position and no row, so a page read after its
 * workspaces were offboarded still continues from there.
 */
export const WorkspacePositionSchema = Schema.Struct({
  createdAt: Schema.DateTimeUtcFromMillis,
  id: WorkspaceIdSchema,
});

export type WorkspacePosition = typeof WorkspacePositionSchema.Type;

/** Which of a partner's workspaces a list holds. */
export interface CustomerWorkspaceFilter {
  /**
   * Those after this position, newest first: created earlier, or at the
   * same instant with a smaller id.
   */
  readonly before: Option.Option<WorkspacePosition>;
  /** The one with this external id, exactly. */
  readonly externalId: Option.Option<string>;
  readonly limit: number;
  /** Those whose name holds this text, whatever its case. */
  readonly name: Option.Option<string>;
}

/** A page of a partner's workspaces, newest first. */
export interface CustomerWorkspacePage {
  /** How many the filter finds in all. */
  readonly total: number;
  readonly workspaces: readonly CustomerWorkspace[];
}

/** A request that created a workspace, as its idempotency key keeps it. */
export interface KeyedCreation {
  readonly fingerprint: string;
  readonly key: string;
}

/** What a key was used for: the workspace, and whether by this request. */
export interface CreationKeyUse {
  readonly sameRequest: boolean;
  readonly workspaceId: WorkspaceId;
}

/** Who owns a workspace a partner owns. */
export interface WorkspaceOwner {
  readonly externalId: Option.Option<string>;
  /** The partner's home workspace, whose plan the workspace shares. */
  readonly homeWorkspaceId: WorkspaceId;
  readonly partnerId: PartnerId;
}

/**
 * The workspaces partners own, in the sign-in service's tables, where
 * every workspace is, and the workspace context's own, which say whose
 * each is. Reads that name a partner only find its own workspaces.
 */
export class CustomerWorkspaces extends Context.Service<
  CustomerWorkspaces,
  {
    /**
     * Creates a workspace for the partner, without members, in the
     * caller's transaction: refused when another of its workspaces has the
     * external id.
     */
    readonly create: (workspace: {
      readonly createdAt: DateTime.Utc;
      readonly externalId: Option.Option<string>;
      readonly name: string;
      readonly partnerId: PartnerId;
    }) => Effect.Effect<CustomerWorkspace, DatabaseError | ExternalIdTaken>;
    readonly ofPartner: (
      partnerId: PartnerId,
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<CustomerWorkspace>, DatabaseError>;
    readonly findByExternalId: (
      partnerId: PartnerId,
      externalId: string
    ) => Effect.Effect<Option.Option<CustomerWorkspace>, DatabaseError>;
    readonly list: (
      partnerId: PartnerId,
      filter: CustomerWorkspaceFilter
    ) => Effect.Effect<CustomerWorkspacePage, DatabaseError>;
    /** Every workspace the partner owns, by id. */
    readonly idsOf: (
      partnerId: PartnerId
    ) => Effect.Effect<readonly WorkspaceId[], DatabaseError>;
    /**
     * Every workspace each of these partners owns, by partner, in one
     * read; a partner that owns none is left out.
     */
    readonly idsOfEach: (
      partnerIds: readonly PartnerId[]
    ) => Effect.Effect<
      ReadonlyMap<PartnerId, readonly WorkspaceId[]>,
      DatabaseError
    >;
    /**
     * Saves the workspace's name and external id, and says whether it was
     * still there: refused when another of the partner's workspaces has
     * the external id.
     */
    readonly save: (
      workspace: CustomerWorkspace
    ) => Effect.Effect<boolean, DatabaseError | ExternalIdTaken>;
    /** What any workspace is called, a partner's or not; none once gone. */
    readonly nameOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<string>, DatabaseError>;
    /** The partner that owns the workspace, if one does. */
    readonly ownerOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<WorkspaceOwner>, DatabaseError>;
    /**
     * The partner that owns each of these workspaces, in one read; one no
     * partner owns is left out.
     */
    readonly ownersIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, WorkspaceOwner>, DatabaseError>;
    /**
     * Forgets that a partner owns the workspace, in the caller's
     * transaction, as the workspace is deleted.
     */
    readonly release: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Holds back, until the caller's transaction ends, any other one that
     * holds the same partner: what counts across a partner's workspaces,
     * then adds to one, takes turns. Outside a transaction it holds
     * nothing.
     */
    readonly hold: (partnerId: PartnerId) => Effect.Effect<void, DatabaseError>;
    /** What the partner's idempotency key was used for after `since`. */
    readonly keyUse: (
      partnerId: PartnerId,
      request: KeyedCreation,
      since: DateTime.Utc
    ) => Effect.Effect<Option.Option<CreationKeyUse>, DatabaseError>;
    /**
     * Keeps the key for the workspace, in the caller's transaction, unless
     * it was used after `since`: it then answers that use, and keeps
     * nothing. A claim of the same key in a transaction still open is
     * waited for.
     */
    readonly claimKey: (
      partnerId: PartnerId,
      request: KeyedCreation,
      use: { readonly at: DateTime.Utc; readonly workspaceId: WorkspaceId },
      since: DateTime.Utc
    ) => Effect.Effect<Option.Option<CreationKeyUse>, DatabaseError>;
    /** Deletes the keys used at `before` or earlier, and says how many. */
    readonly purgeKeys: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/workspace/application/CustomerWorkspaces") {}
