import { and, asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Option } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { defaultLocale } from "#shared/domain/locale.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { DirectoryUnavailable } from "#workspace/application/directory-unavailable.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { Account } from "#workspace/domain/account.ts";
import type { Ban } from "#workspace/domain/ban.ts";
import type { Membership } from "#workspace/domain/membership.ts";

import { member, organization, user } from "./auth-schema.generated.ts";
import { securityPolicies } from "./schema.ts";

const banOf = (
  banned: boolean | null,
  expires: Date | null
): Option.Option<Ban> =>
  banned === true
    ? Option.some({
        expiresAt: Option.fromNullishOr(expires).pipe(
          Option.map((date) => DateTime.makeUnsafe(date))
        ),
      })
    : Option.none();

/**
 * Members, bans and two-step verification, read from Better Auth's tables
 * with the server's own Drizzle driver, with each workspace's requirement.
 * Better Auth writes them; this only reads, from the database on every
 * request, never from a session's cached copy of the user.
 */
export const MemberDirectoryLive = Layer.effect(
  MemberDirectory,
  Effect.gen(function* memberDirectory() {
    const db = yield* Drizzle;

    const unavailable = Effect.mapError(
      (cause: unknown) => new DirectoryUnavailable({ cause })
    );

    // The workspace's requirement comes with the membership, in the same
    // query: a workspace without a policy requires nothing.
    const membershipsWhere = (
      userId: UserId,
      workspaces: ReturnType<typeof eq>
    ) =>
      db
        .select({
          banExpires: user.banExpires,
          banned: user.banned,
          role: member.role,
          twoStepEnabled: user.twoFactorEnabled,
          twoStepRequired: securityPolicies.twoStepRequired,
          workspaceId: member.organizationId,
        })
        .from(member)
        .innerJoin(user, eq(user.id, member.userId))
        .leftJoin(
          securityPolicies,
          eq(securityPolicies.workspaceId, member.organizationId)
        )
        .where(and(eq(member.userId, userId), workspaces))
        .pipe(unavailable);

    type MembershipRow = Effect.Success<
      ReturnType<typeof membershipsWhere>
    >[number];

    const membershipOf = (row: MembershipRow): Membership => ({
      ban: banOf(row.banned, row.banExpires),
      role: row.role,
      twoStep: {
        enabled: row.twoStepEnabled === true,
        required: row.twoStepRequired === true,
      },
    });

    const membership = Effect.fn("MemberDirectory.membership")(
      function* membership(userId: UserId, workspaceId: WorkspaceId) {
        const rows = yield* membershipsWhere(
          userId,
          eq(member.organizationId, workspaceId)
        );

        return Option.fromNullishOr(rows[0]).pipe(Option.map(membershipOf));
      }
    );

    const memberships = Effect.fn("MemberDirectory.memberships")(
      function* memberships(
        userId: UserId,
        workspaceIds: readonly WorkspaceId[]
      ) {
        if (workspaceIds.length === 0) {
          return new Map<WorkspaceId, Membership>();
        }

        const rows = yield* membershipsWhere(
          userId,
          anyUuid(member.organizationId, workspaceIds)
        );

        return new Map(
          rows.map((row) => [
            WorkspaceIdSchema.make(row.workspaceId),
            membershipOf(row),
          ])
        );
      }
    );

    const account = Effect.fn("MemberDirectory.account")(function* account(
      userId: UserId
    ) {
      const [found] = yield* db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
        .pipe(unavailable);

      if (found === undefined) {
        return Option.none();
      }

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

      return Option.some(
        new Account({
          ban: banOf(found.banned, found.banExpires),
          email: found.email,
          emailVerified: found.emailVerified,
          id: userId,
          image: Option.fromNullishOr(found.image),
          locale: found.locale ?? defaultLocale,
          name: found.name,
          twoStepEnabled: found.twoFactorEnabled === true,
          workspaces: workspaces.map((workspace) => ({
            ...workspace,
            id: WorkspaceIdSchema.make(workspace.id),
          })),
        })
      );
    });

    return MemberDirectory.of({ account, membership, memberships });
  })
);
