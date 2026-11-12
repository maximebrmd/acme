import { Context, Effect, Layer } from "effect";
import type { DateTime, Option } from "effect";

import type { InvalidTenantCursor } from "#billing/application/invalid-tenant-cursor.ts";
import { NoPartnerAccount } from "#billing/application/no-partner-account.ts";
import type { PartnerScopeMissing } from "#billing/application/partner-scope-missing.ts";
import type { UsagePeriod } from "#billing/domain/usage-meter.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

/** A partner key, as the request carried it. */
export interface PartnerKeyAsking {
  readonly partnerId: string;
  readonly scopes: readonly string[];
}

/** Which page of a partner's workspaces, and which days. */
export interface TenancyAsked {
  readonly before: Option.Option<string>;
  readonly limit: Option.Option<number>;
  readonly period: UsagePeriod;
}

/** One workspace a partner holds: its home, or a customer's. */
export interface PartnerTenant {
  /** The channels it has connected itself, now. */
  readonly channels: number;
  readonly externalId: Option.Option<string>;
  readonly home: boolean;
  readonly name: string;
  readonly workspaceId: WorkspaceId;
}

/** What a partner held at the end of a day (UTC). */
export interface PartnerDay {
  readonly channels: number;
  /** The day, as its first instant. */
  readonly day: DateTime.Utc;
  readonly workspaces: number;
}

/** What the workspace context says a partner holds. */
export interface Tenancy {
  /** The period's days the daily count kept, oldest first. */
  readonly days: readonly PartnerDay[];
  /** The workspaces it owns, and the channels across them and its home. */
  readonly held: { readonly channels: number; readonly workspaces: number };
  /** Its home workspace, whose plan the others share. */
  readonly homeWorkspaceId: WorkspaceId;
  /** A page of its workspaces, its home first on the first page. */
  readonly page: {
    readonly next: Option.Option<string>;
    readonly tenants: readonly PartnerTenant[];
    readonly total: number;
  };
  /** Its home, then every workspace it owns. */
  readonly workspaceIds: readonly WorkspaceId[];
}

/**
 * The partner accounts billing reports the usage of, as the workspace
 * context keeps them: a key's, which needs the scope workspaces:read, or
 * a home workspace's, for its people with partner:read.
 */
export class PartnerTenancy extends Context.Service<
  PartnerTenancy,
  {
    readonly forKey: (
      key: PartnerKeyAsking,
      asked: TenancyAsked
    ) => Effect.Effect<
      Tenancy,
      | DatabaseError
      | InvalidTenantCursor
      | NoPartnerAccount
      | PartnerScopeMissing
    >;
    readonly forMember: (
      actor: Actor,
      asked: TenancyAsked
    ) => Effect.Effect<
      Tenancy,
      DatabaseError | InvalidTenantCursor | MissingPermission | NoPartnerAccount
    >;
  }
>()("peal-server/billing/application/PartnerTenancy") {
  /** For tests without partners: no key or workspace has an account. */
  static readonly layerNone = Layer.succeed(
    PartnerTenancy,
    PartnerTenancy.of({
      forKey: () => Effect.fail(new NoPartnerAccount()),
      forMember: () => Effect.fail(new NoPartnerAccount()),
    })
  );
}
