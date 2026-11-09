import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Option, Redacted, Ref } from "effect";
import { TestClock } from "effect/testing";

import { StaffActions } from "#staff/application/staff-actions.ts";
import { StaffConsole } from "#staff/application/staff-console.ts";
import { StaffReasonSchema } from "#staff/domain/staff-reason.ts";
import {
  cookiesOfImpersonation,
  memberId,
  memoryStaff,
  profileOf,
  StaffMemory,
  staffId,
} from "#test/staff/support.ts";

const staff = {
  session: Redacted.make("peal.session_token=synthetic-staff"),
  userId: staffId,
};

const reason = StaffReasonSchema.make("Synthetic support ticket");

const action = { reason, staff, userId: memberId };

const accounts = [
  profileOf(staffId, { staff: true }),
  profileOf(memberId, { emailVerified: false }),
];

const recorded = StaffMemory.use(({ events }) => Ref.get(events));

const moderated = StaffMemory.use(({ moderated: done }) => Ref.get(done));

describe(StaffActions, () => {
  it.effect("records each action, then carries it out", () =>
    Effect.gen(function* records() {
      const actions = yield* StaffActions;

      yield* TestClock.setTime(
        DateTime.toEpochMillis(DateTime.makeUnsafe("2026-11-09T12:00:00Z"))
      );

      const until = DateTime.makeUnsafe("2026-11-10T12:00:00Z");

      yield* actions.ban({ ...action, expiresAt: Option.some(until) });
      yield* actions.unban(action);
      yield* actions.revokeSessions(action);
      yield* actions.resendVerification(action);

      const cookies = yield* actions.impersonate(action);

      assert.deepStrictEqual(cookies, cookiesOfImpersonation);

      const events = yield* recorded;

      assert.deepStrictEqual(
        events.map((event) => ({
          action: event.action,
          banExpiresAt: event.banExpiresAt,
          reason: event.reason,
          staffId: event.staffId,
          targetId: event.targetId,
        })),
        [
          "ban",
          "unban",
          "revokeSessions",
          "resendVerification",
          "impersonate",
        ].map((name) => ({
          action: name,
          banExpiresAt: name === "ban" ? Option.some(until) : Option.none(),
          reason: Option.some(reason),
          staffId: Option.some(staffId),
          targetId: Option.some(memberId),
        }))
      );
      assert.strictEqual(
        DateTime.formatIso(events[0]?.at ?? until),
        "2026-11-09T12:00:00.000Z"
      );
      assert.deepStrictEqual(
        (yield* moderated).map(({ action: name }) => name),
        ["ban", "unban", "revokeSessions", "resendVerification", "impersonate"]
      );
    }).pipe(Effect.provide(memoryStaff(accounts)))
  );

  it.effect("refuses an action that does not apply, recording nothing", () =>
    Effect.gen(function* refuses() {
      const actions = yield* StaffActions;

      const self = yield* actions
        .ban({ ...action, expiresAt: Option.none(), userId: staffId })
        .pipe(Effect.flip);

      const staffImpersonated = yield* actions
        .impersonate({ ...action, userId: staffId })
        .pipe(Effect.flip);

      assert.deepInclude(self, { _tag: "ActionRefused", reason: "self" });
      assert.deepInclude(staffImpersonated, {
        _tag: "ActionRefused",
        reason: "self",
      });
      assert.isEmpty(yield* recorded);
      assert.isEmpty(yield* moderated);
    }).pipe(Effect.provide(memoryStaff(accounts)))
  );

  it.effect("answers an account that is not there", () =>
    Effect.gen(function* missing() {
      const actions = yield* StaffActions;

      const failure = yield* actions
        .revokeSessions({ ...action, userId: memberId })
        .pipe(Effect.flip);

      assert.strictEqual(failure._tag, "UserNotFound");
      assert.isEmpty(yield* recorded);
    }).pipe(Effect.provide(memoryStaff([profileOf(staffId)])))
  );

  it.effect("keeps the record of an action that then failed", () =>
    Effect.gen(function* keeps() {
      const actions = yield* StaffActions;

      const failure = yield* actions.unban(action).pipe(Effect.flip);

      assert.strictEqual(failure._tag, "ModerationFailed");
      assert.deepStrictEqual(
        (yield* recorded).map(({ action: name }) => name),
        ["unban"]
      );
    }).pipe(Effect.provide(memoryStaff(accounts, { failing: true })))
  );
});

describe(StaffConsole, () => {
  it.effect("shows a ban only while it holds", () =>
    Effect.gen(function* holds() {
      const console = yield* StaffConsole;

      yield* TestClock.setTime(
        DateTime.toEpochMillis(DateTime.makeUnsafe("2026-11-09T12:00:00Z"))
      );

      const user = yield* console.user(memberId);

      assert.isTrue(Option.isNone(user.ban));

      const page = yield* console.users({ page: 1, query: Option.none() });

      assert.isTrue(page.items.every(({ ban }) => Option.isNone(ban)));
    }).pipe(
      Effect.provide(
        memoryStaff([
          profileOf(memberId, {
            ban: Option.some({
              expiresAt: Option.some(
                DateTime.makeUnsafe("2026-11-09T11:59:59Z")
              ),
              reason: Option.some("Synthetic"),
            }),
          }),
        ])
      )
    )
  );

  it.effect(
    "names the people of the audit log while their accounts exist",
    () =>
      Effect.gen(function* names() {
        const actions = yield* StaffActions;
        const console = yield* StaffConsole;

        yield* actions.revokeSessions(action);

        const page = yield* console.audit({ page: 1, targetId: Option.none() });

        assert.strictEqual(page.total, 1);
        assert.strictEqual(page.pageSize, 25);
        assert.deepStrictEqual(
          page.items.map(({ staff: who, target }) => ({
            staff: who.pipe(Option.map(({ id }) => id)),
            target: target.pipe(Option.map(({ id }) => id)),
          })),
          [{ staff: Option.some(staffId), target: Option.some(memberId) }]
        );
      }).pipe(Effect.provide(memoryStaff(accounts)))
  );
});
