import { asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { defaultLocale, LocaleSchema } from "#shared/domain/locale.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { DirectoryUnavailable } from "#workspace/application/directory-unavailable.ts";
import { WorkspaceRoster } from "#workspace/application/workspace-roster.ts";
import type { RosterMember } from "#workspace/application/workspace-roster.ts";

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

    return WorkspaceRoster.of({ members });
  })
);
