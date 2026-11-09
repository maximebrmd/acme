import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

/** A ban as staff see it: when it ends, if it does, and why. */
export interface StaffBan {
  readonly expiresAt: Option.Option<DateTime.Utc>;
  readonly reason: Option.Option<string>;
}

/** An account in a list: who, never what it wrote. */
export interface UserSummary {
  readonly ban: Option.Option<StaffBan>;
  readonly createdAt: DateTime.Utc;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly id: UserId;
  readonly lastSignInAt: Option.Option<DateTime.Utc>;
  readonly name: string;
  readonly staff: boolean;
}

/** A workspace an account belongs to, with its role there. */
export interface UserMembership {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly role: string;
  readonly slug: string;
}

/** An account, its workspaces and how many sessions it has open. */
export interface UserProfile extends UserSummary {
  readonly locale: Locale;
  readonly sessions: number;
  readonly workspaces: readonly UserMembership[];
}

/** A workspace in a list. */
export interface WorkspaceSummary {
  readonly createdAt: DateTime.Utc;
  readonly id: WorkspaceId;
  readonly members: number;
  readonly name: string;
  readonly slug: string;
}

/** A member of a workspace. */
export interface WorkspaceMember {
  readonly email: string;
  readonly name: string;
  readonly role: string;
  readonly userId: UserId;
}

/** A workspace and its members. */
export interface WorkspaceProfile {
  readonly createdAt: DateTime.Utc;
  readonly id: WorkspaceId;
  readonly members: readonly WorkspaceMember[];
  readonly name: string;
  readonly slug: string;
}

/** Who an id names. */
export interface Person {
  readonly email: string;
  readonly id: UserId;
  readonly name: string;
}

/** What to look for, and which slice of the results. */
export interface Search {
  readonly limit: number;
  readonly offset: number;
  readonly query: Option.Option<string>;
}

/** A slice of results, and how many there are in all. */
export interface Slice<A> {
  readonly items: readonly A[];
  readonly total: number;
}

/** The accounts and workspaces the console reads, newest first. */
export class StaffDirectory extends Context.Service<
  StaffDirectory,
  {
    readonly users: (
      search: Search
    ) => Effect.Effect<Slice<UserSummary>, DatabaseError>;
    readonly user: (
      userId: UserId,
      now: DateTime.Utc
    ) => Effect.Effect<Option.Option<UserProfile>, DatabaseError>;
    readonly workspaces: (
      search: Search
    ) => Effect.Effect<Slice<WorkspaceSummary>, DatabaseError>;
    readonly workspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<WorkspaceProfile>, DatabaseError>;
    /** The accounts these ids name, among those that still exist. */
    readonly people: (
      userIds: readonly UserId[]
    ) => Effect.Effect<readonly Person[], DatabaseError>;
  }
>()("peal-server/staff/application/StaffDirectory") {}
