import { Context, Effect, Layer, Option, Schema } from "effect";
import type { DateTime } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { AuditEventIdSchema } from "#staff/domain/audit-event-id.ts";
import { AuditEvent } from "#staff/domain/audit-event.ts";
import {
  maxReasonLength,
  StaffReasonSchema,
} from "#staff/domain/staff-reason.ts";

import { AuditLog } from "./ports/audit-log.ts";

/** A legal request a staff member answered. */
export interface Disclosure {
  readonly at: DateTime.Utc;
  readonly authority: string;
  readonly reference: string;
  readonly staffId: UserId;
  /** The account or the workspace it named; none for an email address. */
  readonly userId: Option.Option<string>;
  readonly workspaceId: Option.Option<string>;
}

const decodeReason = Schema.decodeUnknownOption(StaffReasonSchema);

const decodeUserId = Schema.decodeUnknownOption(UserIdSchema);

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

/**
 * Each legal request a staff member answers, for the legal context, in the
 * staff audit log too, which every staff member reads: the authority and
 * its reference as the reason, and the account or workspace it named,
 * never an email address it asked about nor what it returned. Answering one
 * alone stays visible to the others.
 */
export class LegalDisclosureAudit extends Context.Service<
  LegalDisclosureAudit,
  {
    readonly disclosed: (
      disclosure: Disclosure
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/staff/application/LegalDisclosureAudit") {
  static readonly layer = Layer.effect(
    LegalDisclosureAudit,
    Effect.gen(function* LegalDisclosureAuditLive() {
      const log = yield* AuditLog;
      const ports = yield* Effect.context<Ids>();

      const disclosed = Effect.fn("LegalDisclosureAudit.disclosed")(
        function* disclosed(disclosure: Disclosure) {
          yield* log.record(
            new AuditEvent({
              action: "legalDisclosure",
              at: disclosure.at,
              banExpiresAt: Option.none(),
              id: yield* newId(AuditEventIdSchema),
              reason: decodeReason(
                `${disclosure.authority}: ${disclosure.reference}`.slice(
                  0,
                  maxReasonLength
                )
              ),
              staffId: Option.some(disclosure.staffId),
              targetId: disclosure.userId.pipe(Option.flatMap(decodeUserId)),
              workspaceId: disclosure.workspaceId.pipe(
                Option.flatMap(decodeWorkspaceId)
              ),
            })
          );
        },
        Effect.provideContext(ports)
      );

      return LegalDisclosureAudit.of({ disclosed });
    })
  );
}
