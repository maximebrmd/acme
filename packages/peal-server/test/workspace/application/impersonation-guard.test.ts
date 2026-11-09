import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Ref } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { AccountDirectory } from "#workspace/application/account-directory.ts";
import { ImpersonationGuard } from "#workspace/application/impersonation-guard.ts";
import { ImpersonationLog } from "#workspace/application/impersonation-log.ts";
import { ImpersonationSessions } from "#workspace/application/impersonation-sessions.ts";
import type { Ban } from "#workspace/domain/ban.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

const staffId = UserIdSchema.make("0b6f2f3e-6c1e-4f0e-8a3b-1d2c3e4f5a60");

const memberId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");

const otherMemberId = UserIdSchema.make("9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d");

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

type Standing = Option.Option<{
  readonly ban: Option.Option<Ban>;
  readonly staff: boolean;
}>;

/** What the guard's ports were asked. */
interface Asked {
  readonly ended: readonly UserId[];
  readonly logged: readonly string[];
}

// The guard on ports in memory: the directory answers `standing` for the
// staff member, whose sessions as the two members end when asked.
const guardWith = (standing: Standing) =>
  Effect.gen(function* guarded() {
    const asked = yield* Ref.make<Asked>({ ended: [], logged: [] });

    const log = (line: string) =>
      Ref.update(asked, (all) => ({ ...all, logged: [...all.logged, line] }));

    const ports = Layer.mergeAll(
      Layer.succeed(
        AccountDirectory,
        AccountDirectory.of({
          account: () => Effect.succeedNone,
          accounts: () => Effect.succeed({ items: [], total: 0 }),
          people: () => Effect.succeed([]),
          standing: () => Effect.succeed(standing),
          workspace: () => Effect.succeedNone,
          workspaces: () => Effect.succeed({ items: [], total: 0 }),
        })
      ),
      Layer.succeed(
        ImpersonationSessions,
        ImpersonationSessions.of({
          endBy: (endedBy) =>
            Ref.modify(asked, (all) => {
              // Ended once: a second call finds none left.
              const ended =
                all.ended.length === 0 ? [memberId, otherMemberId] : [];

              return [
                endedBy === staffId ? ended : [],
                { ...all, ended: [...all.ended, ...ended] },
              ];
            }),
        })
      ),
      Layer.succeed(
        ImpersonationLog,
        ImpersonationLog.of({
          changed: ({
            objectIds,
            operation,
            staffId: by,
            userId,
            workspaceId: at,
          }) =>
            log(
              `changed ${operation} by ${by} as ${userId} in ${Option.getOrElse(at, () => "none")} on ${JSON.stringify(objectIds)}`
            ),
          ended: ({ staffId: by, userId }) => log(`ended ${by} as ${userId}`),
          stopped: ({ operation, staffId: by, userId }) =>
            log(`stopped ${operation} by ${by} as ${userId}`),
        })
      )
    );

    const guard = yield* Effect.service(ImpersonationGuard).pipe(
      Effect.provide(ImpersonationGuard.layer.pipe(Layer.provide(ports)))
    );

    return { asked, guard };
  });

const own = new UserPrincipal({
  impersonatedBy: Option.none(),
  userId: memberId,
});

const impersonated = new UserPrincipal({
  impersonatedBy: Option.some(staffId),
  userId: memberId,
});

const asStaff: Standing = Option.some({ ban: Option.none(), staff: true });

const outcome = <E extends { readonly _tag: string }>(
  effect: Effect.Effect<void, E>
) =>
  effect.pipe(
    Effect.match({ onFailure: ({ _tag }) => _tag, onSuccess: () => "admitted" })
  );

const change = {
  objectIds: { postId: "0190f2a4-0000-7000-8000-000000000001" },
  operation: "posts.update",
  workspaceId: Option.some(workspaceId),
};

describe(ImpersonationGuard, () => {
  it.effect("admits a member's own session without asking anyone", () =>
    Effect.gen(function* admits() {
      const { asked, guard } = yield* guardWith(Option.none());

      assert.strictEqual(yield* outcome(guard.admit(own)), "admitted");

      yield* guard.changed(own, change);
      yield* guard.stopped(own, "auth:/sign-out");

      assert.deepStrictEqual(yield* Ref.get(asked), { ended: [], logged: [] });
    })
  );

  it.effect("admits staff who still are, and records their changes", () =>
    Effect.gen(function* admits() {
      const { asked, guard } = yield* guardWith(asStaff);

      assert.strictEqual(yield* outcome(guard.admit(impersonated)), "admitted");

      yield* guard.changed(impersonated, change);
      yield* guard.stopped(impersonated, "auth:/admin/stop-impersonating");

      assert.deepStrictEqual(yield* Ref.get(asked), {
        ended: [],
        logged: [
          `changed posts.update by ${staffId} as ${memberId} in ${workspaceId} on {"postId":"0190f2a4-0000-7000-8000-000000000001"}`,
          `stopped auth:/admin/stop-impersonating by ${staffId} as ${memberId}`,
        ],
      });
    })
  );

  it.effect.each([
    {
      name: "no longer staff",
      standing: Option.some({ ban: Option.none(), staff: false }),
    },
    {
      name: "banned",
      standing: Option.some({
        ban: Option.some({ expiresAt: Option.none() }),
        staff: true,
      }),
    },
    { name: "gone", standing: Option.none() },
  ])(
    "refuses staff $name, ending and recording every impersonation of theirs once",
    ({ standing }) =>
      Effect.gen(function* refuses() {
        const { asked, guard } = yield* guardWith(standing);

        assert.strictEqual(
          yield* outcome(guard.admit(impersonated)),
          "NotSignedIn"
        );
        assert.strictEqual(
          yield* outcome(guard.admit(impersonated)),
          "NotSignedIn"
        );

        assert.deepStrictEqual(yield* Ref.get(asked), {
          ended: [memberId, otherMemberId],
          logged: [
            `ended ${staffId} as ${memberId}`,
            `ended ${staffId} as ${otherMemberId}`,
          ],
        });
      })
  );
});
