import { and, asc, eq, notExists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DateTime, Effect, Layer, Option } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { WorkspaceOwners } from "#workspace/application/workspace-owners.ts";
import type { MadeWorkspace } from "#workspace/application/workspace-owners.ts";

import { member, organization, user } from "./auth-schema.generated.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const ownerRole = "owner";

const earlier = alias(member, "earlier");

const madeOf = (row: {
  readonly createdAt: Date;
  readonly id: string;
}): MadeWorkspace => ({
  createdAt: DateTime.fromDateUnsafe(row.createdAt),
  workspaceId: WorkspaceIdSchema.make(row.id),
});

/** WorkspaceOwners, read from the sign-in service's members. */
export const DrizzleWorkspaceOwnersLive = Layer.effect(
  WorkspaceOwners,
  Effect.gen(function* DrizzleWorkspaceOwnersLive() {
    const db = yield* Drizzle;

    return WorkspaceOwners.of({
      emailOf: (userId) =>
        db
          .select({ email: user.email })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1)
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => Option.fromUndefinedOr(row?.email)),
            Effect.withSpan("WorkspaceOwners.emailOf")
          ),
      firstOwnedBy: (userId) =>
        db
          .select({ createdAt: organization.createdAt, id: organization.id })
          .from(organization)
          .innerJoin(
            member,
            and(
              eq(member.organizationId, organization.id),
              eq(member.userId, userId),
              eq(member.role, ownerRole)
            )
          )
          // No owner joined before them.
          .where(
            notExists(
              db
                .select({ one: sql`1` })
                .from(earlier)
                .where(
                  and(
                    eq(earlier.organizationId, organization.id),
                    eq(earlier.role, ownerRole),
                    or(
                      sql`${earlier.createdAt} < ${member.createdAt}`,
                      and(
                        eq(earlier.createdAt, member.createdAt),
                        sql`${earlier.userId} < ${member.userId}`
                      )
                    )
                  )
                )
            )
          )
          .orderBy(asc(organization.createdAt), asc(organization.id))
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.map(madeOf)),
            Effect.withSpan("WorkspaceOwners.firstOwnedBy")
          ),
      madeIn: (workspaceIds) =>
        workspaceIds.length === 0
          ? Effect.succeed([])
          : db
              .select({
                createdAt: organization.createdAt,
                id: organization.id,
              })
              .from(organization)
              .where(anyUuid(organization.id, workspaceIds))
              .orderBy(asc(organization.createdAt), asc(organization.id))
              .pipe(
                Effect.mapError(failed),
                Effect.map((rows) => rows.map(madeOf)),
                Effect.withSpan("WorkspaceOwners.madeIn")
              ),
      namesShownTo: (userId, workspaceIds) =>
        workspaceIds.length === 0
          ? Effect.succeed(new Map())
          : db
              .select({ id: organization.id, name: organization.name })
              .from(organization)
              .innerJoin(
                member,
                and(
                  eq(member.organizationId, organization.id),
                  eq(member.userId, userId)
                )
              )
              .where(anyUuid(organization.id, workspaceIds))
              .pipe(
                Effect.mapError(failed),
                Effect.map(
                  (rows) =>
                    new Map<WorkspaceId, string>(
                      rows.map((row) => [
                        WorkspaceIdSchema.make(row.id),
                        row.name,
                      ])
                    )
                ),
                Effect.withSpan("WorkspaceOwners.namesShownTo")
              ),
      oldestIn: (workspaceIds) =>
        workspaceIds.length === 0
          ? Effect.succeed(new Map())
          : db
              .selectDistinctOn([member.organizationId], {
                userId: member.userId,
                workspaceId: member.organizationId,
              })
              .from(member)
              .where(
                and(
                  anyUuid(member.organizationId, workspaceIds),
                  eq(member.role, ownerRole)
                )
              )
              .orderBy(
                asc(member.organizationId),
                asc(member.createdAt),
                asc(member.userId)
              )
              .pipe(
                Effect.mapError(failed),
                Effect.map(
                  (rows) =>
                    new Map<WorkspaceId, UserId>(
                      rows.map((row) => [
                        WorkspaceIdSchema.make(row.workspaceId),
                        UserIdSchema.make(row.userId),
                      ])
                    )
                ),
                Effect.withSpan("WorkspaceOwners.oldestIn")
              ),
      ownersIn: (workspaceIds) =>
        workspaceIds.length === 0
          ? Effect.succeed(new Map())
          : db
              .select({
                userId: member.userId,
                workspaceId: member.organizationId,
              })
              .from(member)
              .where(
                and(
                  anyUuid(member.organizationId, workspaceIds),
                  eq(member.role, ownerRole)
                )
              )
              .orderBy(
                asc(member.organizationId),
                asc(member.createdAt),
                asc(member.userId)
              )
              .pipe(
                Effect.mapError(failed),
                Effect.map((rows) => {
                  const found = new Map<WorkspaceId, UserId[]>();

                  for (const row of rows) {
                    const id = WorkspaceIdSchema.make(row.workspaceId);
                    const owners = found.get(id) ?? [];

                    owners.push(UserIdSchema.make(row.userId));
                    found.set(id, owners);
                  }

                  return found;
                }),
                Effect.withSpan("WorkspaceOwners.ownersIn")
              ),
      ownersOf: (workspaceId) =>
        db
          .select({ userId: member.userId })
          .from(member)
          .where(
            and(
              eq(member.organizationId, workspaceId),
              eq(member.role, ownerRole)
            )
          )
          .orderBy(asc(member.createdAt), asc(member.userId))
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) =>
              rows.map(({ userId }) => UserIdSchema.make(userId))
            ),
            Effect.withSpan("WorkspaceOwners.ownersOf")
          ),
    });
  })
);
