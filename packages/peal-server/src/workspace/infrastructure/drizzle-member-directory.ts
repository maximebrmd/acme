import { and, asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Option } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { defaultLocale } from "#shared/domain/locale.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { DirectoryUnavailable } from "#workspace/application/directory-unavailable.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { Account } from "#workspace/domain/account.ts";
import type { Ban } from "#workspace/domain/ban.ts";

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

    const membership = Effect.fn("MemberDirectory.membership")(
      function* membership(userId: UserId, workspaceId: WorkspaceId) {
        // The workspace's requirement comes with the membership, in the
        // same query: a workspace without a policy requires nothing.
        const rows = yield* db
          .select({
            banExpires: user.banExpires,
            banned: user.banned,
            role: member.role,
            twoStepEnabled: user.twoFactorEnabled,
            twoStepRequired: securityPolicies.twoStepRequired,
          })
          .from(member)
          .innerJoin(user, eq(user.id, member.userId))
          .leftJoin(
            securityPolicies,
            eq(securityPolicies.workspaceId, member.organizationId)
          )
          .where(
            and(
              eq(member.userId, userId),
              eq(member.organizationId, workspaceId)
            )
          )
          .limit(1)
          .pipe(unavailable);

        return Option.fromNullishOr(rows[0]).pipe(
          Option.map((row) => ({
            ban: banOf(row.banned, row.banExpires),
            role: row.role,
            twoStep: {
              enabled: row.twoStepEnabled === true,
              required: row.twoStepRequired === true,
            },
          }))
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

    return MemberDirectory.of({ account, membership });
  })
);
