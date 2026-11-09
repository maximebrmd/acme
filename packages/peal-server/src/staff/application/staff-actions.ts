import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { mayAct } from "#staff/domain/account-rules.ts";
import type { Request } from "#staff/domain/account-rules.ts";
import type { ActionRefused } from "#staff/domain/action-refused.ts";
import { AuditEventIdSchema } from "#staff/domain/audit-event-id.ts";
import { AuditEvent } from "#staff/domain/audit-event.ts";
import { banHolds } from "#staff/domain/ban-term.ts";
import type { StaffReason } from "#staff/domain/staff-reason.ts";

import type { ModerationFailed } from "./moderation-failed.ts";
import { AuditLog } from "./ports/audit-log.ts";
import { Moderation } from "./ports/moderation.ts";
import type { StaffMember } from "./ports/moderation.ts";
import { StaffDirectory } from "./ports/staff-directory.ts";
import type { UserProfile } from "./ports/staff-directory.ts";
import { UserNotFound } from "./user-not-found.ts";

/** Staff acting on an account, and why. */
export interface Action {
  readonly reason: StaffReason;
  readonly staff: StaffMember;
  readonly userId: UserId;
}

type Failure = ActionRefused | DatabaseError | ModerationFailed | UserNotFound;

/**
 * What staff do to accounts. Each action reads the account, checks the
 * rules (`mayAct`), records itself in the audit log, and only then is
 * carried out: nothing staff do goes unrecorded, and a record whose action
 * then failed says what staff asked for. Its callers are staff, which the
 * API's StaffAccess checked.
 */
export class StaffActions extends Context.Service<
  StaffActions,
  {
    readonly ban: (
      action: Action & { readonly expiresAt: Option.Option<DateTime.Utc> }
    ) => Effect.Effect<void, Failure>;
    readonly unban: (action: Action) => Effect.Effect<void, Failure>;
    readonly revokeSessions: (action: Action) => Effect.Effect<void, Failure>;
    readonly resendVerification: (
      action: Action
    ) => Effect.Effect<void, Failure>;
    /**
     * Signs the staff member's browser in as the account: the Set-Cookie
     * headers to answer with.
     */
    readonly impersonate: (
      action: Action
    ) => Effect.Effect<readonly string[], Failure>;
  }
>()("peal-server/staff/application/StaffActions") {
  static readonly layer = Layer.effect(
    StaffActions,
    Effect.gen(function* StaffActionsLive() {
      const directory = yield* StaffDirectory;
      const moderation = yield* Moderation;
      const log = yield* AuditLog;
      const ports = yield* Effect.context<Ids>();

      // Reads the account, checks the rules and records the action.
      const recorded = Effect.fn("StaffActions.recorded")(function* recorded(
        { reason, staff, userId }: Action,
        request: Request
      ): Effect.fn.Return<UserProfile, Failure, Ids> {
        const now = yield* DateTime.now;
        const found = yield* directory.user(userId, now);

        if (Option.isNone(found)) {
          return yield* new UserNotFound({ userId });
        }

        const target = found.value;

        const banned = Option.exists(target.ban, ({ expiresAt }) =>
          banHolds(expiresAt, now)
        );

        yield* Effect.fromResult(
          mayAct(staff.userId, { ...target, banned }, request, now)
        );

        yield* log.record(
          new AuditEvent({
            action: request.action,
            at: now,
            banExpiresAt:
              request.action === "ban" ? request.expiresAt : Option.none(),
            id: yield* newId(AuditEventIdSchema),
            reason: Option.some(reason),
            staffId: Option.some(staff.userId),
            targetId: Option.some(target.id),
          })
        );

        return target;
      });

      const act = <A>(
        action: Action,
        request: Request,
        carryOut: (target: UserProfile) => Effect.Effect<A, ModerationFailed>
      ) =>
        recorded(action, request).pipe(
          Effect.flatMap(carryOut),
          Effect.provideContext(ports),
          Effect.annotateLogs({
            action: request.action,
            staffId: action.staff.userId,
            targetId: action.userId,
          })
        );

      return StaffActions.of({
        ban: (action) =>
          act(action, { action: "ban", expiresAt: action.expiresAt }, () =>
            moderation.ban({
              expiresAt: action.expiresAt,
              reason: action.reason,
              staff: action.staff,
              userId: action.userId,
            })
          ).pipe(Effect.withSpan("StaffActions.ban")),
        impersonate: (action) =>
          act(action, { action: "impersonate" }, () =>
            moderation.impersonate(action)
          ).pipe(Effect.withSpan("StaffActions.impersonate")),
        resendVerification: (action) =>
          act(action, { action: "resendVerification" }, (target) =>
            moderation.resendVerification(target)
          ).pipe(Effect.withSpan("StaffActions.resendVerification")),
        revokeSessions: (action) =>
          act(action, { action: "revokeSessions" }, () =>
            moderation.revokeSessions(action)
          ).pipe(Effect.withSpan("StaffActions.revokeSessions")),
        unban: (action) =>
          act(action, { action: "unban" }, () => moderation.unban(action)).pipe(
            Effect.withSpan("StaffActions.unban")
          ),
      });
    })
  );
}
