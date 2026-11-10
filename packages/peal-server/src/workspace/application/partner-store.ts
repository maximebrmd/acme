import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { PartnerId, PartnerKeyId } from "#workspace/domain/partner-id.ts";
import type { PartnerKey } from "#workspace/domain/partner-key.ts";
import type { Partner } from "#workspace/domain/partner.ts";

/** What a partner held on a day (UTC). */
export interface PartnerUsageDay {
  readonly channels: number;
  /** The day, as `2026-11-10`. */
  readonly day: string;
  readonly workspaces: number;
}

/**
 * The partner accounts and their keys. A key is kept as its digest only:
 * `keyByDigest` finds the key a request sent.
 */
export class PartnerStore extends Context.Service<
  PartnerStore,
  {
    /** The partner account whose home workspace this is. */
    readonly ofWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<Partner>, DatabaseError>;
    readonly get: (
      partnerId: PartnerId
    ) => Effect.Effect<Option.Option<Partner>, DatabaseError>;
    /** Every partner account, oldest first, for the daily count. */
    readonly all: Effect.Effect<readonly Partner[], DatabaseError>;
    /**
     * Opens the account, and says whether it did: false when the workspace
     * has one already, or is itself a workspace a partner owns.
     */
    readonly open: (partner: Partner) => Effect.Effect<boolean, DatabaseError>;
    /** Saves the account's name, logo and return origins. */
    readonly save: (partner: Partner) => Effect.Effect<void, DatabaseError>;
    /**
     * Deletes the account of this home workspace with its keys, in the
     * caller's transaction. Says whether there was one. It must own no
     * workspace any more.
     */
    readonly closeOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
    readonly keys: (
      partnerId: PartnerId
    ) => Effect.Effect<readonly PartnerKey[], DatabaseError>;
    readonly addKey: (
      key: PartnerKey,
      digest: string,
      createdBy: UserId
    ) => Effect.Effect<void, DatabaseError>;
    /** The key kept under this digest, expired or not. */
    readonly keyByDigest: (
      digest: string
    ) => Effect.Effect<Option.Option<PartnerKey>, DatabaseError>;
    /** Deletes the partner's key, and says whether it was there. */
    readonly removeKey: (
      partnerId: PartnerId,
      keyId: PartnerKeyId
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Keeps what the partner held on the day, replacing an earlier count. */
    readonly recordUsage: (
      partnerId: PartnerId,
      usage: PartnerUsageDay
    ) => Effect.Effect<void, DatabaseError>;
    /** The partner's daily counts since `since`, oldest first. */
    readonly usage: (
      partnerId: PartnerId,
      since: DateTime.Utc
    ) => Effect.Effect<readonly PartnerUsageDay[], DatabaseError>;
  }
>()("peal-server/workspace/application/PartnerStore") {}
