import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { defaultLocale } from "#shared/domain/locale.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { AccountDirectory } from "#workspace/application/account-directory.ts";
import type {
  AccountListing,
  DirectorySearch,
  StoredBan,
} from "#workspace/application/account-directory.ts";
import { DirectoryUnavailable } from "#workspace/application/directory-unavailable.ts";
import type { Ban } from "#workspace/domain/ban.ts";
import { isStaffRole } from "#workspace/domain/staff-role.ts";

import {
  member,
  organization,
  session,
  user,
} from "./auth-schema.generated.ts";

const unavailable = Effect.mapError(
  (cause: unknown) => new DirectoryUnavailable({ cause })
);

const utc = (date: Date): DateTime.Utc => DateTime.makeUnsafe(date);

const isUuid = Schema.is(Schema.String.check(Schema.isUUID()));

// A LIKE pattern that finds `text` anywhere, its wildcards taken literally.
const containing = (text: string): string =>
  `%${text.replaceAll(/[\\%_]/gu, (character) => `\\${character}`)}%`;

const banOf = (
  banned: boolean | null,
  expires: Date | null
): Option.Option<Ban> =>
  banned === true
    ? Option.some({
        expiresAt: Option.fromNullOr(expires).pipe(Option.map(utc)),
      })
    : Option.none();

const storedBanOf = (row: {
  readonly banExpires: Date | null;
  readonly banReason: string | null;
  readonly banned: boolean | null;
}): Option.Option<StoredBan> =>
  banOf(row.banned, row.banExpires).pipe(
    Option.map((ban) => ({ ...ban, reason: Option.fromNullOr(row.banReason) }))
  );

// When the newest session the account signed in itself started: staff's
// impersonations are theirs, not the account's. The driver reads
// timestamptz as a Date.
const lastSignIn = sql<Date | null>`(SELECT max(${session.createdAt}) FROM ${session} WHERE ${session.userId} = ${user.id} AND ${session.impersonatedBy} IS NULL)`;

const accountColumns = {
  banExpires: user.banExpires,
  banReason: user.banReason,
  banned: user.banned,
  createdAt: user.createdAt,
  email: user.email,
  emailVerified: user.emailVerified,
  id: user.id,
  lastSignInAt: lastSignIn,
  locale: user.locale,
  name: user.name,
  role: user.role,
};

interface AccountRow {
  readonly banExpires: Date | null;
  readonly banReason: string | null;
  readonly banned: boolean | null;
  readonly createdAt: Date;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly id: string;
  readonly lastSignInAt: Date | null;
  readonly name: string;
  readonly role: string | null;
}

const listingOf = (row: AccountRow): AccountListing => ({
  ban: storedBanOf(row),
  createdAt: utc(row.createdAt),
  email: row.email,
  emailVerified: row.emailVerified,
  id: UserIdSchema.make(row.id),
  lastSignInAt: Option.fromNullOr(row.lastSignInAt).pipe(Option.map(utc)),
  name: row.name,
  staff: isStaffRole(Option.fromNullOr(row.role)),
});

// What a search for accounts matches: a whole id, or part of an email or a
// name, in any letter case.
const accountsMatching = (query: Option.Option<string>): SQL | undefined =>
  query.pipe(
    Option.map((text) =>
      isUuid(text)
        ? eq(user.id, text.toLowerCase())
        : or(
            ilike(user.email, containing(text)),
            ilike(user.name, containing(text))
          )
    ),
    Option.getOrUndefined
  );

const workspacesMatching = (query: Option.Option<string>): SQL | undefined =>
  query.pipe(
    Option.map((text) =>
      isUuid(text)
        ? eq(organization.id, text.toLowerCase())
        : or(
            ilike(organization.name, containing(text)),
            ilike(organization.slug, containing(text))
          )
    ),
    Option.getOrUndefined
  );

const memberCount = sql<number>`(SELECT count(*)::int FROM ${member} WHERE ${member.organizationId} = ${organization.id})`;

/**
 * The staff console's view of Better Auth's tables, read with the server's
 * own Drizzle driver. Better Auth writes them; this only reads.
 */
export const AccountDirectoryLive = Layer.effect(
  AccountDirectory,
  Effect.gen(function* AccountDirectoryLive() {
    const db = yield* Drizzle;

    const accounts = Effect.fn("AccountDirectory.accounts")(function* accounts({
      limit,
      offset,
      query,
    }: DirectorySearch) {
      const where = accountsMatching(query);

      const [counted] = yield* db
        .select({ total: count() })
        .from(user)
        .where(where)
        .pipe(unavailable);

      const rows = yield* db
        .select(accountColumns)
        .from(user)
        .where(where)
        .orderBy(desc(user.createdAt), desc(user.id))
        .limit(limit)
        .offset(offset)
        .pipe(unavailable);

      return { items: rows.map(listingOf), total: counted?.total ?? 0 };
    });

    const account = Effect.fn("AccountDirectory.account")(function* account(
      userId: UserId,
      now: DateTime.Utc
    ) {
      const [found] = yield* db
        .select(accountColumns)
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
        .pipe(unavailable);

      if (found === undefined) {
        return Option.none();
      }

      const [sessions] = yield* db
        .select({ open: count() })
        .from(session)
        .where(
          and(
            eq(session.userId, userId),
            isNull(session.impersonatedBy),
            gt(session.expiresAt, DateTime.toDateUtc(now))
          )
        )
        .pipe(unavailable);

      const workspaces = yield* db
        .select({
          id: organization.id,
          name: organization.name,
          role: member.role,
          slug: organization.slug,
        })
        .from(member)
        .innerJoin(organization, eq(organization.id, member.organizationId))
        .where(eq(member.userId, userId))
        .orderBy(asc(organization.name), asc(organization.id))
        .pipe(unavailable);

      return Option.some({
        ...listingOf(found),
        locale: found.locale ?? defaultLocale,
        sessions: sessions?.open ?? 0,
        workspaces: workspaces.map((workspace) => ({
          ...workspace,
          id: WorkspaceIdSchema.make(workspace.id),
        })),
      });
    });

    const workspaces = Effect.fn("AccountDirectory.workspaces")(
      function* workspaces({ limit, offset, query }: DirectorySearch) {
        const where = workspacesMatching(query);

        const [counted] = yield* db
          .select({ total: count() })
          .from(organization)
          .where(where)
          .pipe(unavailable);

        const rows = yield* db
          .select({
            createdAt: organization.createdAt,
            id: organization.id,
            members: memberCount,
            name: organization.name,
            slug: organization.slug,
          })
          .from(organization)
          .where(where)
          .orderBy(desc(organization.createdAt), desc(organization.id))
          .limit(limit)
          .offset(offset)
          .pipe(unavailable);

        return {
          items: rows.map((row) => ({
            ...row,
            createdAt: utc(row.createdAt),
            id: WorkspaceIdSchema.make(row.id),
          })),
          total: counted?.total ?? 0,
        };
      }
    );

    const workspace = Effect.fn("AccountDirectory.workspace")(
      function* workspace(workspaceId: WorkspaceId) {
        const [found] = yield* db
          .select({
            createdAt: organization.createdAt,
            name: organization.name,
            slug: organization.slug,
          })
          .from(organization)
          .where(eq(organization.id, workspaceId))
          .limit(1)
          .pipe(unavailable);

        if (found === undefined) {
          return Option.none();
        }

        const members = yield* db
          .select({
            email: user.email,
            name: user.name,
            role: member.role,
            userId: user.id,
          })
          .from(member)
          .innerJoin(user, eq(user.id, member.userId))
          .where(eq(member.organizationId, workspaceId))
          .orderBy(asc(member.createdAt), asc(member.id))
          .pipe(unavailable);

        return Option.some({
          createdAt: utc(found.createdAt),
          id: workspaceId,
          members: members.map((person) => ({
            ...person,
            userId: UserIdSchema.make(person.userId),
          })),
          name: found.name,
          slug: found.slug,
        });
      }
    );

    const people = Effect.fn("AccountDirectory.people")(function* people(
      userIds: readonly UserId[]
    ) {
      if (userIds.length === 0) {
        return [];
      }

      const rows = yield* db
        .select({ email: user.email, id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, [...userIds]))
        .pipe(unavailable);

      return rows.map((row) => ({ ...row, id: UserIdSchema.make(row.id) }));
    });

    const standing = Effect.fn("AccountDirectory.standing")(function* standing(
      userId: UserId
    ) {
      const [found] = yield* db
        .select({
          banExpires: user.banExpires,
          banned: user.banned,
          role: user.role,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
        .pipe(unavailable);

      return Option.fromNullishOr(found).pipe(
        Option.map((row) => ({
          ban: banOf(row.banned, row.banExpires),
          staff: isStaffRole(Option.fromNullOr(row.role)),
        }))
      );
    });

    return AccountDirectory.of({
      account,
      accounts,
      people,
      standing,
      workspace,
      workspaces,
    });
  })
);
