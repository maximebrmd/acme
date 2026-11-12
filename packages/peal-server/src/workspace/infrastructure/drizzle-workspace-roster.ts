import { and, asc, count, eq, gt, lt, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { defaultLocale, LocaleSchema } from "#shared/domain/locale.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { DirectoryUnavailable } from "#workspace/application/directory-unavailable.ts";
import { WorkspaceRoster } from "#workspace/application/workspace-roster.ts";
import type {
  RosterMember,
  WorkspacePageRequest,
} from "#workspace/application/workspace-roster.ts";

import { member, organization, user } from "./auth-schema.generated.ts";

const decodeLocale = Schema.decodeUnknownOption(LocaleSchema);

/** Workspace members, read from Better Auth's tables. */
export const WorkspaceRosterLive = Layer.effect(
  WorkspaceRoster,
  Effect.gen(function* WorkspaceRosterLive() {
    const db = yield* Drizzle;

    const unavailable = Effect.mapError(
      (cause: unknown) => new DirectoryUnavailable({ cause })
    );

    const members = Effect.fn("WorkspaceRoster.members")(function* members(
      workspaceId: WorkspaceId
    ) {
      const [workspace] = yield* db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, workspaceId))
        .limit(1)
        .pipe(unavailable);

      if (workspace === undefined) {
        return Option.none();
      }

      const rows = yield* db
        .select({
          banExpires: user.banExpires,
          banned: user.banned,
          email: user.email,
          locale: user.locale,
          role: member.role,
          userId: user.id,
        })
        .from(member)
        .innerJoin(user, eq(user.id, member.userId))
        .where(eq(member.organizationId, workspaceId))
        .orderBy(asc(member.createdAt), asc(user.id))
        .pipe(unavailable);

      const roster: readonly RosterMember[] = rows.map((row) => ({
        ban:
          row.banned === true
            ? Option.some({
                expiresAt: Option.fromNullishOr(row.banExpires).pipe(
                  Option.map((date) => DateTime.makeUnsafe(date))
                ),
              })
            : Option.none(),
        email: row.email,
        locale: Option.getOrElse(decodeLocale(row.locale), () => defaultLocale),
        role: row.role,
        userId: UserIdSchema.make(row.userId),
      }));

      return Option.some({ members: roster, name: workspace.name });
    });

    // The workspaces by their primary key, each counting its members by
    // the members' index, so a page reads its own rows only.
    const seatsPage = Effect.fn("WorkspaceRoster.seatsPage")(
      function* seatsPage({
        after,
        createdBefore,
        limit,
      }: WorkspacePageRequest) {
        const rows = yield* db
          .select({
            members: sql<number>`(SELECT count(*)::int FROM ${member} WHERE ${member.organizationId} = ${organization.id})`,
            workspaceId: organization.id,
          })
          .from(organization)
          .where(
            and(
              after.pipe(
                Option.map((id) => gt(organization.id, id)),
                Option.getOrUndefined
              ),
              lt(organization.createdAt, DateTime.toDate(createdBefore))
            )
          )
          .orderBy(asc(organization.id))
          .limit(limit)
          .pipe(unavailable);

        return rows.map((row) => ({
          members: row.members,
          workspaceId: WorkspaceIdSchema.make(row.workspaceId),
        }));
      }
    );

    // The members `members` lists: those whose account is there.
    const seatsIn = Effect.fn("WorkspaceRoster.seatsIn")(function* seatsIn(
      workspaceIds: readonly WorkspaceId[]
    ) {
      if (workspaceIds.length === 0) {
        return new Map<WorkspaceId, number>();
      }

      const rows = yield* db
        .select({
          members: count(),
          workspaceId: member.organizationId,
        })
        .from(member)
        .innerJoin(user, eq(user.id, member.userId))
        .where(anyUuid(member.organizationId, workspaceIds))
        .groupBy(member.organizationId)
        .pipe(unavailable);

      return new Map(
        rows.map((row) => [
          WorkspaceIdSchema.make(row.workspaceId),
          row.members,
        ])
      );
    });

    return WorkspaceRoster.of({ members, seatsIn, seatsPage });
  })
);
