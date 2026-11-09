import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";
import type { WorkspaceMembership } from "#workspace/domain/account.ts";
import type { Ban } from "#workspace/domain/ban.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";

/** A ban as Better Auth stores it, with the reason staff gave. */
export interface StoredBan extends Ban {
  readonly reason: Option.Option<string>;
}

/** What staff may read of an account in a list: who, never what it wrote. */
export interface AccountListing {
  readonly ban: Option.Option<StoredBan>;
  readonly createdAt: DateTime.Utc;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly id: UserId;
  /** When the newest of the sessions it signed in itself started. */
  readonly lastSignInAt: Option.Option<DateTime.Utc>;
  readonly name: string;
  /** Whether its role makes it staff. */
  readonly staff: boolean;
}

/** An account, its workspaces, and how many sessions it has open. */
export interface AccountProfile extends AccountListing {
  readonly locale: Locale;
  /** Its own sessions that have not expired, not those staff opened. */
  readonly sessions: number;
  readonly workspaces: readonly WorkspaceMembership[];
}

/** A workspace in a list, with how many members it has. */
export interface WorkspaceListing {
  readonly createdAt: DateTime.Utc;
  readonly id: WorkspaceId;
  readonly members: number;
  readonly name: string;
  readonly slug: string;
}

/** Someone in a workspace, with their role there. */
export interface WorkspacePerson {
  readonly email: string;
  readonly name: string;
  readonly role: string;
  readonly userId: UserId;
}

/** A workspace and its members. */
export interface WorkspaceProfile {
  readonly createdAt: DateTime.Utc;
  readonly id: WorkspaceId;
  readonly members: readonly WorkspacePerson[];
  readonly name: string;
  readonly slug: string;
}

/** Who an id names, for the audit log. */
export interface Person {
  readonly email: string;
  readonly id: UserId;
  readonly name: string;
}

/** A search: what to look for, and which slice of the results. */
export interface DirectorySearch {
  readonly limit: number;
  readonly offset: number;
  /** Part of an email, a name or a slug, or a whole id; none lists all. */
  readonly query: Option.Option<string>;
}

/** One slice of a search, and how many results there are in all. */
export interface DirectorySlice<A> {
  readonly items: readonly A[];
  readonly total: number;
}

/**
 * Accounts and workspaces as the staff console reads them, newest first,
 * from Better Auth's tables. Metadata only: who, when and where, never what
 * anyone wrote.
 */
export class AccountDirectory extends Context.Service<
  AccountDirectory,
  {
    readonly accounts: (
      search: DirectorySearch
    ) => Effect.Effect<DirectorySlice<AccountListing>, DirectoryUnavailable>;
    /** `now` tells which sessions are still open. */
    readonly account: (
      userId: UserId,
      now: DateTime.Utc
    ) => Effect.Effect<Option.Option<AccountProfile>, DirectoryUnavailable>;
    readonly workspaces: (
      search: DirectorySearch
    ) => Effect.Effect<DirectorySlice<WorkspaceListing>, DirectoryUnavailable>;
    readonly workspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<WorkspaceProfile>, DirectoryUnavailable>;
    /** The accounts these ids name, among those that still exist. */
    readonly people: (
      userIds: readonly UserId[]
    ) => Effect.Effect<readonly Person[], DirectoryUnavailable>;
    /**
     * Whether an account is staff, and its ban, read fresh, or none if it
     * is gone.
     */
    readonly standing: (userId: UserId) => Effect.Effect<
      Option.Option<{
        readonly ban: Option.Option<Ban>;
        /** Whether it may also answer legal requests (`legalRole`). */
        readonly legal: boolean;
        readonly staff: boolean;
      }>,
      DirectoryUnavailable
    >;
  }
>()("peal-server/workspace/application/AccountDirectory") {}
