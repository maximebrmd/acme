import { asc, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { defaultLocale, LocaleSchema } from "#shared/domain/locale.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { AccountLookup } from "#workspace/application/account-lookup.ts";
import type { HeldAccount } from "#workspace/application/account-lookup.ts";
import { DirectoryUnavailable } from "#workspace/application/directory-unavailable.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

import { member, organization, user } from "./auth-schema.generated.ts";

const decodeLocale = Schema.decodeUnknownOption(LocaleSchema);

/** Accounts by email address or id, read from Better Auth's tables. */
export const DrizzleAccountLookup = Layer.effect(
  AccountLookup,
  Effect.gen(function* DrizzleAccountLookup() {
    const db = yield* Drizzle;

    const unavailable = Effect.mapError(
      (cause: unknown) => new DirectoryUnavailable({ cause })
    );

    const found = Effect.fn("AccountLookup.found")(function* found(
      where: SQL,
      permission: Permission
    ) {
      const [account] = yield* db
        .select({ email: user.email, id: user.id, locale: user.locale })
        .from(user)
        .where(where)
        .orderBy(asc(user.createdAt), asc(user.id))
        .limit(1)
        .pipe(unavailable);

      if (account === undefined) {
        return Option.none<HeldAccount>();
      }

      const memberships = yield* db
        .select({
          id: organization.id,
          name: organization.name,
          role: member.role,
        })
        .from(member)
        .innerJoin(organization, eq(organization.id, member.organizationId))
        .where(eq(member.userId, account.id))
        .orderBy(asc(organization.name), asc(organization.id))
        .pipe(unavailable);

      return Option.some<HeldAccount>({
        email: account.email,
        locale: Option.getOrElse(
          decodeLocale(account.locale),
          () => defaultLocale
        ),
        userId: UserIdSchema.make(account.id),
        workspaces: memberships
          .filter(({ role }) => permissionsFor(role).includes(permission))
          .map(({ id, name }) => ({ id: WorkspaceIdSchema.make(id), name })),
      });
    });

    return AccountLookup.of({
      // Better Auth stores addresses in lowercase; one typed otherwise
      // still finds its account.
      byEmail: (email, permission) =>
        found(
          sql`lower(${user.email}) = ${email.trim().toLowerCase()}`,
          permission
        ),
      byId: (userId, permission) => found(eq(user.id, userId), permission),
    });
  })
);
