import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Option, Redacted, Ref } from "effect";
import { TestClock } from "effect/testing";

import { UserIdSchema } from "#shared/domain/ids.ts";
import { ImpersonationAudit } from "#staff/application/impersonation-audit.ts";
import { StaffActions } from "#staff/application/staff-actions.ts";
import { AuditOperationSchema } from "#staff/domain/audit-operation.ts";
import { StaffReasonSchema } from "#staff/domain/staff-reason.ts";
import {
  memberId,
  memoryStaff,
  profileOf,
  StaffMemory,
  staffId,
  workspaceId,
} from "#test/staff/support.ts";

const recorded = StaffMemory.use(({ events }) => Ref.get(events));

const at = "2026-11-09T12:00:00Z";

const atNoon = TestClock.setTime(
  DateTime.toEpochMillis(DateTime.makeUnsafe(at))
);

const postId = "0190f2a4-0000-7000-8000-000000000001";

// What an event says, without its id and time.
const saying = recorded.pipe(
  Effect.map((events) =>
    events.map((event) => ({
      action: event.action,
      objectIds: event.objectIds,
      operation: event.operation,
      reason: event.reason,
      staffId: event.staffId,
      targetId: event.targetId,
      workspaceId: event.workspaceId,
    }))
  )
);

const impersonation = { staffId, userId: memberId };

describe(ImpersonationAudit, () => {
  it.effect(
    "records a change staff made as a member: who, as whom, where, what and on which ids",
    () =>
      Effect.gen(function* records() {
        const audit = yield* ImpersonationAudit;

        yield* atNoon;

        yield* audit.changed({
          ...impersonation,
          objectIds: {
            // Not an id: left out, as it could be anything.
            note: "Some words a client sent",
            postId,
          },
          operation: "posts.update",
          workspaceId: Option.some(workspaceId),
        });

        assert.deepStrictEqual(yield* saying, [
          {
            action: "impersonatedChange",
            objectIds: { postId },
            operation: Option.some(AuditOperationSchema.make("posts.update")),
            reason: Option.none(),
            staffId: Option.some(staffId),
            targetId: Option.some(memberId),
            workspaceId: Option.some(workspaceId),
          },
        ]);
        assert.strictEqual(
          DateTime.formatIso(
            (yield* recorded)[0]?.at ?? DateTime.makeUnsafe(0)
          ),
          "2026-11-09T12:00:00.000Z"
        );
      }).pipe(Effect.provide(memoryStaff([])))
  );

  it.effect("records the end of an impersonation, by staff or the server", () =>
    Effect.gen(function* ends() {
      const audit = yield* ImpersonationAudit;

      yield* audit.stopped({
        ...impersonation,
        operation: "auth:/admin/stop-impersonating",
      });
      yield* audit.ended(impersonation);

      assert.deepStrictEqual(yield* saying, [
        {
          action: "stopImpersonating",
          objectIds: {},
          operation: Option.some(
            AuditOperationSchema.make("auth:/admin/stop-impersonating")
          ),
          reason: Option.none(),
          staffId: Option.some(staffId),
          targetId: Option.some(memberId),
          workspaceId: Option.none(),
        },
        {
          action: "impersonationEnded",
          objectIds: {},
          operation: Option.none(),
          reason: Option.none(),
          staffId: Option.some(staffId),
          targetId: Option.some(memberId),
          workspaceId: Option.none(),
        },
      ]);
    }).pipe(Effect.provide(memoryStaff([])))
  );
});

const otherStaffId = UserIdSchema.make("3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e0f");

describe("StaffActions ending impersonations", () => {
  it.effect.each(["ban", "revokeSessions"] as const)(
    "records each impersonation that $0 ended",
    (name) =>
      Effect.gen(function* records() {
        const actions = yield* StaffActions;

        const action = {
          reason: StaffReasonSchema.make("Synthetic support ticket"),
          staff: {
            session: Redacted.make("peal.session_token=synthetic-other-staff"),
            userId: otherStaffId,
          },
          userId: staffId,
        };

        yield* name === "ban"
          ? actions.ban({ ...action, expiresAt: Option.none() })
          : actions.revokeSessions(action);

        assert.deepStrictEqual(
          (yield* saying).map(({ action: done, staffId: by, targetId }) => ({
            action: done,
            by,
            targetId,
          })),
          [
            {
              action: name,
              by: Option.some(otherStaffId),
              targetId: Option.some(staffId),
            },
            {
              action: "impersonationEnded",
              by: Option.some(staffId),
              targetId: Option.some(memberId),
            },
          ]
        );
      }).pipe(
        Effect.provide(
          memoryStaff(
            [
              profileOf(otherStaffId, { staff: true }),
              profileOf(staffId, { staff: true }),
            ],
            { ending: [{ staffId, userId: memberId }] }
          )
        )
      )
  );
});
