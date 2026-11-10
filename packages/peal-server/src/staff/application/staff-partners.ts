import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { AuditEventIdSchema } from "#staff/domain/audit-event-id.ts";
import { AuditEvent } from "#staff/domain/audit-event.ts";
import type { StaffReason } from "#staff/domain/staff-reason.ts";

import { AuditLog } from "./ports/audit-log.ts";
import { PartnerDesk } from "./ports/partner-desk.ts";
import type { PartnerPosition } from "./ports/partner-desk.ts";
import { WorkspaceNotFound } from "./workspace-not-found.ts";

/**
 * Partner accounts in the staff console: where a workspace stands (its own
 * account and how many workspaces it owns, or the partner that owns it),
 * and granting one, which is how a server whose workspaces cannot open
 * their own gives them out. A grant is recorded in the audit log, with the
 * workspace and the reason, before it is carried out.
 */
export class StaffPartners extends Context.Service<
  StaffPartners,
  {
    readonly positionOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<PartnerPosition, DatabaseError>;
    readonly grant: (grant: {
      readonly reason: StaffReason;
      readonly staffId: UserId;
      readonly workspaceId: WorkspaceId;
    }) => Effect.Effect<PartnerPosition, DatabaseError | WorkspaceNotFound>;
  }
>()("peal-server/staff/application/StaffPartners") {
  static readonly layer = Layer.effect(
    StaffPartners,
    Effect.gen(function* StaffPartnersLive() {
      const desk = yield* PartnerDesk;
      const log = yield* AuditLog;
      const ports = yield* Effect.context<Ids>();

      const grant = Effect.fn("StaffPartners.grant")(
        function* grant({
          reason,
          staffId,
          workspaceId,
        }: {
          readonly reason: StaffReason;
          readonly staffId: UserId;
          readonly workspaceId: WorkspaceId;
        }) {
          yield* log.record(
            new AuditEvent({
              action: "grantPartner",
              at: yield* DateTime.now,
              banExpiresAt: Option.none(),
              id: yield* newId(AuditEventIdSchema),
              reason: Option.some(reason),
              staffId: Option.some(staffId),
              targetId: Option.none(),
              workspaceId: Option.some(workspaceId),
            })
          );

          if (!(yield* desk.grant(workspaceId))) {
            return yield* new WorkspaceNotFound({ workspaceId });
          }

          return yield* desk.positionOf(workspaceId);
        },
        Effect.provideContext(ports),
        (effect, { staffId, workspaceId }) =>
          effect.pipe(
            Effect.annotateLogs({
              action: "grantPartner",
              staffId,
              workspaceId,
            })
          )
      );

      return StaffPartners.of({
        grant,
        positionOf: (workspaceId) => desk.positionOf(workspaceId),
      });
    })
  );
}
