// The staff console's ports in memory: a directory of synthetic accounts,
// moderation that records what it was asked, and an audit log in a list.
import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import { Ids } from "#shared/application/ids.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { ImpersonationAudit } from "#staff/application/impersonation-audit.ts";
import { ModerationFailed } from "#staff/application/moderation-failed.ts";
import { AuditLog } from "#staff/application/ports/audit-log.ts";
import { Moderation } from "#staff/application/ports/moderation.ts";
import type { EndedImpersonation } from "#staff/application/ports/moderation.ts";
import { PartnerDesk } from "#staff/application/ports/partner-desk.ts";
import { StaffDirectory } from "#staff/application/ports/staff-directory.ts";
import type { UserProfile } from "#staff/application/ports/staff-directory.ts";
import { SystemHealth } from "#staff/application/ports/system-health.ts";
import { WorkspaceHealth } from "#staff/application/ports/workspace-health.ts";
import { StaffActions } from "#staff/application/staff-actions.ts";
import { StaffConsole } from "#staff/application/staff-console.ts";
import { StaffPartners } from "#staff/application/staff-partners.ts";
import type { AuditEvent } from "#staff/domain/audit-event.ts";

export const staffId = UserIdSchema.make(
  "0b6f2f3e-6c1e-4f0e-8a3b-1d2c3e4f5a60"
);

export const memberId = UserIdSchema.make(
  "7c9e6679-7425-40de-944b-e07fc1f90ae7"
);

export const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

const createdAt = DateTime.makeUnsafe("2026-10-01T09:00:00Z");

/** A synthetic account, confirmed, in one workspace. */
export const profileOf = (
  id: UserId,
  overrides: Partial<UserProfile> = {}
): UserProfile => ({
  ban: Option.none(),
  createdAt,
  email: `person+${id.slice(0, 8)}@example.test`,
  emailVerified: true,
  id,
  lastSignInAt: Option.some(createdAt),
  locale: "en",
  name: "Synthetic Person",
  sessions: 1,
  staff: false,
  workspaces: [
    { id: workspaceId, name: "Studio", role: "owner", slug: "studio" },
  ],
  ...overrides,
});

/** A workspace a partner owns, which holds no partner account itself. */
export const ownedWorkspaceId = WorkspaceIdSchema.make(
  "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a"
);

/** What moderation was asked to do. */
export interface Moderated {
  readonly action: AuditEvent["action"];
  readonly userId: UserId;
}

/** The cookies the in-memory moderation answers an impersonation with. */
export const cookiesOfImpersonation = [
  "peal.session_token=synthetic-impersonation; Path=/; HttpOnly; SameSite=Lax",
  "peal.admin_session=synthetic-staff-session; Path=/; HttpOnly; SameSite=Lax",
];

/** What the in-memory ports kept, for tests to read. */
export class StaffMemory extends Context.Service<
  StaffMemory,
  {
    readonly events: Ref.Ref<readonly AuditEvent[]>;
    readonly moderated: Ref.Ref<readonly Moderated[]>;
  }
>()("peal-server/test/staff/StaffMemory") {}

const sameTarget = (event: AuditEvent, targetId: Option.Option<UserId>) =>
  Option.match(targetId, {
    onNone: () => true,
    onSome: (id) => Option.contains(event.targetId, id),
  });

/**
 * The console's use cases, and the audit of impersonations, on ports in
 * memory, with these accounts, and a moderation that fails when `failing`
 * is set, and whose bans and sign-outs end the impersonations `ending`
 * lists. StaffMemory reads what they kept.
 */
export const memoryStaff = (
  accounts: readonly UserProfile[],
  options: {
    readonly ending?: readonly EndedImpersonation[];
    readonly failing?: boolean;
  } = {}
) => {
  const find = (userId: UserId) =>
    Option.fromNullishOr(accounts.find(({ id }) => id === userId));

  return Layer.unwrap(
    Effect.gen(function* memoryPorts() {
      const events = yield* Ref.make<readonly AuditEvent[]>([]);
      const moderated = yield* Ref.make<readonly Moderated[]>([]);
      const granted = yield* Ref.make<readonly WorkspaceId[]>([]);

      const carry = (done: Moderated) =>
        options.failing === true
          ? Effect.fail(new ModerationFailed({ cause: "synthetic failure" }))
          : Ref.update(moderated, (all) => [...all, done]);

      const ports = Layer.mergeAll(
        Layer.succeed(
          StaffDirectory,
          StaffDirectory.of({
            people: (userIds) =>
              Effect.succeed(accounts.filter(({ id }) => userIds.includes(id))),
            user: (userId) => Effect.succeed(find(userId)),
            users: () =>
              Effect.succeed({ items: accounts, total: accounts.length }),
            workspace: () => Effect.succeedNone,
            workspaces: () => Effect.succeed({ items: [], total: 0 }),
          })
        ),
        Layer.succeed(
          Moderation,
          Moderation.of({
            ban: ({ userId }) =>
              carry({ action: "ban", userId }).pipe(
                Effect.as(options.ending ?? [])
              ),
            impersonate: ({ userId }) =>
              carry({ action: "impersonate", userId }).pipe(
                Effect.as(cookiesOfImpersonation)
              ),
            resendVerification: ({ email }) =>
              carry({
                action: "resendVerification",
                userId:
                  accounts.find((account) => account.email === email)?.id ??
                  memberId,
              }),
            revokeSessions: ({ userId }) =>
              carry({ action: "revokeSessions", userId }).pipe(
                Effect.as(options.ending ?? [])
              ),
            unban: ({ userId }) => carry({ action: "unban", userId }),
          })
        ),
        Layer.succeed(
          AuditLog,
          AuditLog.of({
            read: ({ limit, offset, targetId }) =>
              Ref.get(events).pipe(
                Effect.map((all) => {
                  const kept = all
                    .filter((event) => sameTarget(event, targetId))
                    .toReversed();

                  return {
                    items: kept.slice(offset, offset + limit),
                    total: kept.length,
                  };
                })
              ),
            record: (event) => Ref.update(events, (all) => [...all, event]),
          })
        ),
        Layer.succeed(
          WorkspaceHealth,
          WorkspaceHealth.of({
            ads: () => Effect.succeed({ accounts: [], boosts: {} }),
            billing: () =>
              Effect.succeed({
                plan: Option.none(),
                subscription: Option.none(),
              }),
            channels: () => Effect.succeed([]),
            posts: () =>
              Effect.succeed({
                awaitingApproval: 0,
                cancelled: 0,
                draft: 0,
                finished: 0,
                publishing: 0,
                scheduled: 0,
              }),
            troubles: () => Effect.succeed([]),
            webhooks: () => Effect.succeed([]),
          })
        ),
        Layer.succeed(
          SystemHealth,
          SystemHealth.of({
            due: () => Effect.succeed({ posts: [], total: 0 }),
            failingChannels: () => Effect.succeed([]),
            overdue: () => Effect.succeed(0),
            ready: Effect.succeed(true),
            release: Option.some("synthetic-release"),
          })
        ),
        // Partner accounts in memory: granted to any workspace but the
        // one a partner owns.
        Layer.succeed(
          PartnerDesk,
          PartnerDesk.of({
            grant: (asked) =>
              asked === ownedWorkspaceId
                ? Effect.succeed(false)
                : Ref.update(granted, (all) => [...all, asked]).pipe(
                    Effect.as(true)
                  ),
            positionOf: (asked) =>
              Ref.get(granted).pipe(
                Effect.map((all) => ({
                  account: all.includes(asked)
                    ? Option.some({
                        createdAt: DateTime.makeUnsafe("2026-11-10T09:00:00Z"),
                        id: "00000000-0000-7000-8000-0000000000a1",
                        name: "Synthetic partner",
                        workspaces: 0,
                      })
                    : Option.none(),
                  owner: Option.none(),
                }))
              ),
          })
        ),
        Ids.layerTest
      );

      return Layer.mergeAll(
        StaffActions.layer,
        StaffConsole.layer,
        StaffPartners.layer,
        ImpersonationAudit.layer
      ).pipe(
        Layer.provideMerge(ports),
        Layer.merge(
          Layer.succeed(StaffMemory, StaffMemory.of({ events, moderated }))
        )
      );
    })
  );
};
