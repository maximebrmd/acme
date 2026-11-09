import { and, asc, count, eq, gt, inArray, ne } from "drizzle-orm";
import {
  DateTime,
  Effect,
  FiberSet,
  Layer,
  Option,
  Result,
  Schema,
} from "effect";
import { SqlClient, SqlError } from "effect/sql";

import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";
import { roomForOneMore } from "#shared/domain/allowance.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { defaultLocale, LocaleSchema } from "#shared/domain/locale.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { AlreadyMember } from "#workspace/application/already-member.ts";
import { AuthUnavailable } from "#workspace/application/auth-unavailable.ts";
import { DirectoryUnavailable } from "#workspace/application/directory-unavailable.ts";
import { TooManyInvitations } from "#workspace/application/too-many-invitations.ts";
import { WorkspacePeople } from "#workspace/application/workspace-people.ts";
import type { InvitationRequest } from "#workspace/application/workspace-people.ts";
import { Invitation } from "#workspace/domain/invitation.ts";
import { NotAMember } from "#workspace/domain/not-a-member.ts";
import {
  invitation,
  member,
  organization,
  user,
} from "#workspace/infrastructure/auth-schema.generated.ts";

import {
  invitationLifetime,
  invitationUrl,
  pendingInvitationLimit,
} from "./options.ts";
import { AuthSettings } from "./settings.ts";

const utc = (date: Date): DateTime.Utc => DateTime.makeUnsafe(date);

const isUuid = Schema.is(Schema.String.check(Schema.isUUID()));

const decodeLocale = Schema.decodeUnknownOption(LocaleSchema);

const localeOf = (stored: string | null) =>
  Option.getOrElse(decodeLocale(stored), () => defaultLocale);

const toInvitation = (row: typeof invitation.$inferSelect) =>
  new Invitation({
    createdAt: utc(row.createdAt),
    email: row.email,
    expiresAt: utc(row.expiresAt),
    id: row.id,
    inviterId: UserIdSchema.make(row.inviterId),
    role: row.role ?? "",
    workspaceId: WorkspaceIdSchema.make(row.organizationId),
  });

/**
 * Members and invitations in Better Auth's tables, through the server's own
 * Drizzle driver. An invitation sent here follows the rules of Better Auth's
 * `/organization/invite-member`, which the web app calls: one role, never to
 * a member, replacing a pending one to the same address, within the pending
 * invitations' limit and the plan's room, then emailed in the invitee's
 * language. It is checked and written under the workspace's lock, so
 * invitations sent together never pass a limit.
 */
export const WorkspacePeopleLive = Layer.effect(
  WorkspacePeople,
  Effect.gen(function* WorkspacePeopleLive() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;
    const entitlements = yield* WorkspaceEntitlements;
    const emails = yield* SendAuthEmail;
    const { publicUrl } = yield* AuthSettings;

    // Requests never wait for their emails. Those still on their way get
    // the layer's lifetime, as Better Auth's do.
    const fibers = yield* FiberSet.make();
    const run = yield* FiberSet.runtime(fibers)();

    const unavailable = Effect.mapError(
      (cause: unknown) => new DirectoryUnavailable({ cause })
    );

    const failed = Effect.mapError(
      (cause: unknown) => new AuthUnavailable({ cause })
    );

    const members = Effect.fn("WorkspacePeople.members")(function* members(
      workspaceId: WorkspaceId
    ) {
      const rows = yield* db
        .select({
          email: user.email,
          joinedAt: member.createdAt,
          name: user.name,
          role: member.role,
          userId: user.id,
        })
        .from(member)
        .innerJoin(user, eq(user.id, member.userId))
        .where(eq(member.organizationId, workspaceId))
        .orderBy(asc(member.createdAt), asc(user.id))
        .pipe(unavailable);

      return rows.map((row) => ({
        email: row.email,
        joinedAt: utc(row.joinedAt),
        name: row.name,
        role: row.role,
        userId: UserIdSchema.make(row.userId),
      }));
    });

    const pendingInvitations = Effect.fn("WorkspacePeople.pendingInvitations")(
      function* pendingInvitations(workspaceId: WorkspaceId) {
        const rows = yield* db
          .select()
          .from(invitation)
          .where(
            and(
              eq(invitation.organizationId, workspaceId),
              eq(invitation.status, "pending")
            )
          )
          .orderBy(asc(invitation.createdAt), asc(invitation.id))
          .pipe(unavailable);

        return rows.map(toInvitation);
      }
    );

    // Checks the invitation and writes it, inside the workspace's lock.
    const write = (request: InvitationRequest, email: string) =>
      Effect.gen(function* writeInvitation() {
        const now = yield* DateTime.now;
        const { workspaceId } = request;

        const [workspace] = yield* db
          .select({ name: organization.name })
          .from(organization)
          .where(eq(organization.id, workspaceId))
          .limit(1)
          .pipe(failed);

        const [inviter] = yield* db
          .select({ locale: user.locale, name: user.name })
          .from(member)
          .innerJoin(user, eq(user.id, member.userId))
          .where(
            and(
              eq(member.organizationId, workspaceId),
              eq(member.userId, request.inviterId)
            )
          )
          .limit(1)
          .pipe(failed);

        if (workspace === undefined || inviter === undefined) {
          return yield* new NotAMember({ workspaceId });
        }

        const [joined] = yield* db
          .select({ id: member.id })
          .from(member)
          .innerJoin(user, eq(user.id, member.userId))
          .where(
            and(eq(member.organizationId, workspaceId), eq(user.email, email))
          )
          .limit(1)
          .pipe(failed);

        if (joined !== undefined) {
          return yield* new AlreadyMember();
        }

        // The other invitations still pending: one to the same address is
        // replaced, and expired ones no longer count.
        const [others] = yield* db
          .select({ pending: count() })
          .from(invitation)
          .where(
            and(
              eq(invitation.organizationId, workspaceId),
              eq(invitation.status, "pending"),
              gt(invitation.expiresAt, DateTime.toDateUtc(now)),
              ne(invitation.email, email)
            )
          )
          .pipe(failed);

        const pending = others?.pending ?? 0;

        if (pending >= pendingInvitationLimit) {
          return yield* new TooManyInvitations();
        }

        const [seats] = yield* db
          .select({ taken: count() })
          .from(member)
          .where(eq(member.organizationId, workspaceId))
          .pipe(failed);

        const { allowances } = yield* entitlements
          .of(workspaceId)
          .pipe(Effect.orDie);

        const room = roomForOneMore(
          "members",
          allowances.members,
          (seats?.taken ?? 0) + pending
        );

        if (Result.isFailure(room)) {
          return yield* room.failure;
        }

        yield* db
          .update(invitation)
          .set({ status: "canceled" })
          .where(
            and(
              eq(invitation.organizationId, workspaceId),
              eq(invitation.status, "pending"),
              eq(invitation.email, email)
            )
          )
          .pipe(failed);

        const [written] = yield* db
          .insert(invitation)
          .values({
            createdAt: DateTime.toDateUtc(now),
            email,
            expiresAt: DateTime.toDateUtc(
              DateTime.add(now, { seconds: invitationLifetime })
            ),
            inviterId: request.inviterId,
            organizationId: workspaceId,
            role: request.role,
            status: "pending",
          })
          .returning()
          .pipe(failed);

        if (written === undefined) {
          return yield* Effect.die(new Error("The invitation was not written"));
        }

        // In the reader's language: the invitee's, when they have an
        // account, otherwise the inviter's.
        const [invitee] = yield* db
          .select({ locale: user.locale })
          .from(user)
          .where(eq(user.email, email))
          .limit(1)
          .pipe(failed);

        return {
          inviter,
          locale: localeOf(invitee?.locale ?? inviter.locale),
          sent: toInvitation(written),
          workspaceName: workspace.name,
        };
      });

    const invite = Effect.fn("WorkspacePeople.invite")(function* invite(
      request: InvitationRequest
    ) {
      // Better Auth keeps addresses in lower case.
      const email = request.email.toLowerCase();

      const { inviter, locale, sent, workspaceName } = yield* client
        .withTransaction(
          client`SELECT pg_advisory_xact_lock(hashtext('peal-server/workspace/invitations'), hashtext(${request.workspaceId}))`.pipe(
            failed,
            Effect.andThen(write(request, email))
          )
        )
        .pipe(
          Effect.catchIf(SqlError.isSqlError, (cause) =>
            Effect.fail(new AuthUnavailable({ cause }))
          )
        );

      run(
        emails.send({
          _tag: "Invitation",
          inviterName: inviter.name,
          locale,
          role: sent.role,
          to: sent.email,
          url: invitationUrl(publicUrl, locale, sent.id),
          workspaceName,
        })
      );

      return sent;
    });

    // Ids are UUIDs: anything else names no invitation, and would not reach
    // the database's uuid column.
    const revoke = Effect.fn("WorkspacePeople.revoke")(function* revoke(
      workspaceId: WorkspaceId,
      invitationId: string
    ) {
      if (!isUuid(invitationId)) {
        return false;
      }

      const revoked = yield* db
        .update(invitation)
        .set({ status: "canceled" })
        .where(
          and(
            eq(invitation.id, invitationId),
            eq(invitation.organizationId, workspaceId),
            eq(invitation.status, "pending")
          )
        )
        .returning({ id: invitation.id })
        .pipe(unavailable);

      return revoked.length > 0;
    });

    const removeMembers = Effect.fn("WorkspacePeople.removeMembers")(
      function* removeMembers(
        workspaceId: WorkspaceId,
        userIds: readonly UserId[]
      ) {
        if (userIds.length === 0) {
          return 0;
        }

        const removed = yield* db
          .delete(member)
          .where(
            and(
              eq(member.organizationId, workspaceId),
              inArray(member.userId, [...userIds])
            )
          )
          .returning({ id: member.id })
          .pipe(unavailable);

        return removed.length;
      }
    );

    const revokeAll = Effect.fn("WorkspacePeople.revokeAll")(
      function* revokeAll(workspaceId: WorkspaceId) {
        const revoked = yield* db
          .update(invitation)
          .set({ status: "canceled" })
          .where(
            and(
              eq(invitation.organizationId, workspaceId),
              eq(invitation.status, "pending")
            )
          )
          .returning({ id: invitation.id })
          .pipe(unavailable);

        return revoked.length;
      }
    );

    return WorkspacePeople.of({
      invite,
      members,
      pendingInvitations,
      removeMembers,
      revoke,
      revokeAll,
    });
  })
);
