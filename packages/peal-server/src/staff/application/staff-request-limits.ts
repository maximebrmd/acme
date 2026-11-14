import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { AuditEventIdSchema } from "#staff/domain/audit-event-id.ts";
import { AuditEvent } from "#staff/domain/audit-event.ts";
import type { StaffReason } from "#staff/domain/staff-reason.ts";

import { AuditLog } from "./ports/audit-log.ts";
import { RequestLimitDesk } from "./ports/request-limit-desk.ts";
import type { StaffRequestLimit } from "./ports/request-limit-desk.ts";
import { StaffDirectory } from "./ports/staff-directory.ts";
import { RequestLimitsNotBilled } from "./request-limits-not-billed.ts";
import { WorkspaceNotFound } from "./workspace-not-found.ts";

/** What staff ask of a workspace's rate limit, and why. */
export interface RequestLimitChange {
  readonly reason: StaffReason;
  /** Its own limit, or none to give it its standing's again. */
  readonly requestsPerMinute: Option.Option<number>;
  readonly staffId: UserId;
  readonly workspaceId: WorkspaceId;
}

/**
 * A workspace's API rate limit in the staff console: read, with what
 * applies to its keys now, and given a limit of its own on request (the
 * rate card's 1,200 a minute), or its standing's again, each change
 * recorded in the audit log (`setRequestLimit`, with the workspace, the
 * limit and the reason) before it is made. A workspace that does not
 * exist, or a server that does not bill, records nothing.
 */
export class StaffRequestLimits extends Context.Service<
  StaffRequestLimits,
  {
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<StaffRequestLimit, DatabaseError | WorkspaceNotFound>;
    readonly set: (
      change: RequestLimitChange
    ) => Effect.Effect<
      StaffRequestLimit,
      DatabaseError | RequestLimitsNotBilled | WorkspaceNotFound
    >;
  }
>()("peal-server/staff/application/StaffRequestLimits") {
  static readonly layer = Layer.effect(
    StaffRequestLimits,
    Effect.gen(function* StaffRequestLimitsLive() {
      const desk = yield* RequestLimitDesk;
      const directory = yield* StaffDirectory;
      const log = yield* AuditLog;
      const ports = yield* Effect.context<Ids>();

      const of = Effect.fn("StaffRequestLimits.of")(function* of(
        workspaceId: WorkspaceId
      ) {
        if (Option.isNone(yield* directory.workspace(workspaceId))) {
          return yield* new WorkspaceNotFound({ workspaceId });
        }

        return yield* desk.of(workspaceId);
      });

      const set = Effect.fn("StaffRequestLimits.set")(
        function* set({
          reason,
          requestsPerMinute,
          staffId,
          workspaceId,
        }: RequestLimitChange) {
          const current = yield* of(workspaceId);

          if (!current.bills) {
            return yield* new RequestLimitsNotBilled();
          }

          yield* log.record(
            new AuditEvent({
              action: "setRequestLimit",
              at: yield* DateTime.now,
              banExpiresAt: Option.none(),
              id: yield* newId(AuditEventIdSchema),
              objectIds: {
                requestsPerMinute: Option.match(requestsPerMinute, {
                  onNone: () => "standing",
                  onSome: String,
                }),
              },
              reason: Option.some(reason),
              staffId: Option.some(staffId),
              targetId: Option.none(),
              workspaceId: Option.some(workspaceId),
            })
          );

          const changed = yield* desk.set(workspaceId, requestsPerMinute);

          return yield* Option.match(changed, {
            onNone: () => Effect.fail(new RequestLimitsNotBilled()),
            onSome: Effect.succeed,
          });
        },
        Effect.provideContext(ports),
        (effect, { staffId, workspaceId }) =>
          effect.pipe(
            Effect.annotateLogs({
              action: "setRequestLimit",
              staffId,
              workspaceId,
            })
          )
      );

      return StaffRequestLimits.of({ of, set });
    })
  );
}
