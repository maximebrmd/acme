import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { defaultLocale } from "#shared/domain/locale.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { AccountStore } from "#workspace/application/account-store.ts";
import type {
  AccountRecords,
  InvitationRecord,
} from "#workspace/application/account-store.ts";

import {
  account,
  apikey,
  deviceCode,
  invitation,
  member,
  oauthAccessToken,
  oauthConsent,
  oauthRefreshToken,
  organization,
  session,
  subscription,
  user,
  verification,
} from "./auth-schema.generated.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const utc = (date: Date) => DateTime.fromDateUnsafe(date);

// Better Auth stores addresses as they were typed for invitations, and in
// lowercase for users: compare them in lowercase.
const sameAddress = (column: typeof invitation.email, email: string) =>
  eq(sql`lower(${column})`, email.toLowerCase());

const invitationOf = (row: {
  readonly createdAt: Date;
  readonly email: string;
  readonly expiresAt: Date;
  readonly role: string | null;
  readonly status: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
}): InvitationRecord => ({
  ...row,
  createdAt: utc(row.createdAt),
  expiresAt: utc(row.expiresAt),
});

/**
 * AccountStore on Better Auth's tables, with the server's own Drizzle
 * driver, so a deletion commits in the same transaction as the other
 * contexts' erasures, which Better Auth's own pool could not join. Rows are
 * deleted as Better Auth would delete them: what references a user or a
 * workspace with a foreign key goes with it (sessions, sign-in methods,
 * memberships, invitations, OAuth tokens and consents), and what refers to
 * them by id alone (API keys, device codes, password reset tokens, grants
 * bound to a workspace, the Stripe plugin's subscriptions) is deleted here.
 */
export const DrizzleAccountStore = Layer.effect(
  AccountStore,
  Effect.gen(function* DrizzleAccountStore() {
    const db = yield* Drizzle;

    const invitationColumns = {
      createdAt: invitation.createdAt,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      role: invitation.role,
      status: invitation.status,
      workspaceId: invitation.organizationId,
      workspaceName: organization.name,
    };

    const records = Effect.fn("AccountStore.records")(function* records(
      userId: UserId
    ) {
      const [found] = yield* db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
        .pipe(Effect.mapError(failed));

      if (found === undefined) {
        return Option.none<AccountRecords>();
      }

      const signInMethods = yield* db
        .select({
          createdAt: account.createdAt,
          provider: account.providerId,
          updatedAt: account.updatedAt,
        })
        .from(account)
        .where(eq(account.userId, userId))
        .orderBy(asc(account.createdAt))
        .pipe(Effect.mapError(failed));

      const sessions = yield* db
        .select({
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          ipAddress: session.ipAddress,
          updatedAt: session.updatedAt,
          userAgent: session.userAgent,
        })
        .from(session)
        // Not those staff opened to act as the user: their address and
        // browser are the staff member's, and Better Auth lists them to
        // nobody but staff.
        .where(and(eq(session.userId, userId), isNull(session.impersonatedBy)))
        .orderBy(asc(session.createdAt))
        .pipe(Effect.mapError(failed));

      const memberships = yield* db
        .select({
          joinedAt: member.createdAt,
          role: member.role,
          workspaceId: member.organizationId,
          workspaceName: organization.name,
        })
        .from(member)
        .innerJoin(organization, eq(organization.id, member.organizationId))
        .where(eq(member.userId, userId))
        .orderBy(asc(member.createdAt))
        .pipe(Effect.mapError(failed));

      const sent = yield* db
        .select(invitationColumns)
        .from(invitation)
        .innerJoin(organization, eq(organization.id, invitation.organizationId))
        .where(eq(invitation.inviterId, userId))
        .orderBy(asc(invitation.createdAt))
        .pipe(Effect.mapError(failed));

      const received = yield* db
        .select(invitationColumns)
        .from(invitation)
        .innerJoin(organization, eq(organization.id, invitation.organizationId))
        .where(sameAddress(invitation.email, found.email))
        .orderBy(asc(invitation.createdAt))
        .pipe(Effect.mapError(failed));

      const kept: AccountRecords = {
        invitationsReceived: received.map(invitationOf),
        invitationsSent: sent.map(invitationOf),
        memberships: memberships.map((row) => ({
          ...row,
          joinedAt: utc(row.joinedAt),
        })),
        sessions: sessions.map((row) => ({
          ...row,
          createdAt: utc(row.createdAt),
          expiresAt: utc(row.expiresAt),
          updatedAt: utc(row.updatedAt),
        })),
        signInMethods: signInMethods.map((row) => ({
          ...row,
          createdAt: utc(row.createdAt),
          updatedAt: utc(row.updatedAt),
        })),
        user: {
          createdAt: utc(found.createdAt),
          email: found.email,
          emailVerified: found.emailVerified,
          id: userId,
          image: found.image,
          locale: found.locale ?? defaultLocale,
          name: found.name,
          updatedAt: utc(found.updatedAt),
        },
      };

      return Option.some(kept);
    });

    const standings = Effect.fn("AccountStore.standings")(function* standings(
      userId: UserId
    ) {
      const own = yield* db
        .select({
          role: member.role,
          workspaceId: member.organizationId,
          workspaceName: organization.name,
        })
        .from(member)
        .innerJoin(organization, eq(organization.id, member.organizationId))
        .where(eq(member.userId, userId))
        .orderBy(asc(organization.name), asc(organization.id))
        // Joining a workspace checks its row, which this lock holds back,
        // as it holds back another account's closure reading the same
        // workspace: two owners closing at once cannot both leave it.
        .for("update", { of: organization })
        .pipe(Effect.mapError(failed));

      const everyone =
        own.length === 0
          ? []
          : yield* db
              .select({
                role: member.role,
                workspaceId: member.organizationId,
              })
              .from(member)
              .where(
                inArray(
                  member.organizationId,
                  own.map(({ workspaceId }) => workspaceId)
                )
              )
              .pipe(Effect.mapError(failed));

      return own.map(({ role, workspaceId, workspaceName }) => ({
        memberRoles: everyone
          .filter((row) => row.workspaceId === workspaceId)
          .map((row) => row.role),
        role,
        workspaceId: WorkspaceIdSchema.make(workspaceId),
        workspaceName,
      }));
    });

    const workspace = Effect.fn("AccountStore.workspace")(function* workspace(
      workspaceId: WorkspaceId
    ) {
      const [found] = yield* db
        .select({
          createdAt: organization.createdAt,
          name: organization.name,
          slug: organization.slug,
        })
        .from(organization)
        .where(eq(organization.id, workspaceId))
        .limit(1)
        .for("update")
        .pipe(Effect.mapError(failed));

      return Option.fromUndefinedOr(found).pipe(
        Option.map((row) => ({
          createdAt: utc(row.createdAt),
          id: workspaceId,
          name: row.name,
          slug: row.slug,
        }))
      );
    });

    const deleteWorkspace = Effect.fn("AccountStore.deleteWorkspace")(
      function* deleteWorkspace(workspaceId: WorkspaceId) {
        // API keys refer to their workspace by id alone, as do the OAuth
        // grants of MCP clients bound to it and sessions that opened it.
        yield* db
          .delete(apikey)
          .where(eq(apikey.referenceId, workspaceId))
          .pipe(Effect.mapError(failed));

        yield* db
          .delete(oauthAccessToken)
          .where(eq(oauthAccessToken.referenceId, workspaceId))
          .pipe(Effect.mapError(failed));

        yield* db
          .delete(oauthRefreshToken)
          .where(eq(oauthRefreshToken.referenceId, workspaceId))
          .pipe(Effect.mapError(failed));

        yield* db
          .delete(oauthConsent)
          .where(eq(oauthConsent.referenceId, workspaceId))
          .pipe(Effect.mapError(failed));

        yield* db
          .update(session)
          .set({ activeOrganizationId: null })
          .where(eq(session.activeOrganizationId, workspaceId))
          .pipe(Effect.mapError(failed));

        // The Stripe plugin's copy of the workspace's subscriptions, which
        // refer to it by id alone; deleting is refused while one may still
        // bill it, and Stripe keeps the customer and its invoices.
        yield* db
          .delete(subscription)
          .where(eq(subscription.referenceId, workspaceId))
          .pipe(Effect.mapError(failed));

        // Members and invitations go with it.
        yield* db
          .delete(organization)
          .where(eq(organization.id, workspaceId))
          .pipe(Effect.mapError(failed));
      }
    );

    const deleteUser = Effect.fn("AccountStore.deleteUser")(
      function* deleteUser(userId: UserId) {
        const [found] = yield* db
          .select({ email: user.email })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1)
          .pipe(Effect.mapError(failed));

        if (found === undefined) {
          return;
        }

        yield* db
          .delete(invitation)
          .where(sameAddress(invitation.email, found.email))
          .pipe(Effect.mapError(failed));

        yield* db
          .delete(deviceCode)
          .where(eq(deviceCode.userId, userId))
          .pipe(Effect.mapError(failed));

        // Subscriptions belong to workspaces, but one made for the user
        // would refer to them by id alone.
        yield* db
          .delete(subscription)
          .where(eq(subscription.referenceId, userId))
          .pipe(Effect.mapError(failed));

        // Sessions they opened as staff to act as someone else hang on that
        // person's account, and would outlive them: they end with them.
        yield* db
          .delete(session)
          .where(eq(session.impersonatedBy, userId))
          .pipe(Effect.mapError(failed));

        // Password reset tokens hold the user's id as their value.
        yield* db
          .delete(verification)
          .where(
            and(
              eq(verification.value, userId),
              sql`${verification.identifier} LIKE 'reset-password:%'`
            )
          )
          .pipe(Effect.mapError(failed));

        // Sessions, sign-in methods, memberships, the invitations they sent,
        // the OAuth clients they registered, their consents and tokens go
        // with them.
        yield* db
          .delete(user)
          .where(eq(user.id, userId))
          .pipe(Effect.mapError(failed));
      }
    );

    return AccountStore.of({
      deleteUser,
      deleteWorkspace,
      records,
      standings,
      workspace,
    });
  })
);
