import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import type { Membership } from "#workspace/domain/membership.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

const userId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");

const user = new UserPrincipal({ impersonatedBy: Option.none(), userId });

const directoryWith = (membership: Option.Option<Membership>) =>
  ResolveMember.layer.pipe(
    Layer.provide(
      Layer.succeed(
        MemberDirectory,
        MemberDirectory.of({
          account: () => Effect.succeedNone,
          membership: () => Effect.succeed(membership),
        })
      )
    )
  );

const resolve = ResolveMember.use((members) =>
  members.resolve(user, workspaceId)
);

// Banned until noon on 9 November 2026; the test clock starts in 1970.
const bannedUntilNoon: Membership = {
  ban: Option.some({
    expiresAt: Option.some(DateTime.makeUnsafe("2026-11-09T12:00:00Z")),
  }),
  role: "editor",
};

describe(ResolveMember, () => {
  it.effect("reads the member's role on every request", () =>
    Effect.gen(function* resolves() {
      const actor = yield* resolve.pipe(
        Effect.provide(
          directoryWith(Option.some({ ban: Option.none(), role: "viewer" }))
        )
      );

      assert.deepStrictEqual(actor.permissions, [
        "analytics:read",
        "channel:read",
        "engagement:read",
        "media:read",
        "post:read",
      ]);
    })
  );

  it.effect("refuses a banned member until the ban ends", () =>
    Effect.gen(function* bans() {
      const during = yield* resolve.pipe(
        Effect.provide(directoryWith(Option.some(bannedUntilNoon))),
        Effect.flip
      );

      assert.strictEqual(during._tag, "BannedUser");

      yield* TestClock.setTime(
        DateTime.toEpochMillis(DateTime.makeUnsafe("2026-11-09T12:00:01Z"))
      );

      const after = yield* resolve.pipe(
        Effect.provide(directoryWith(Option.some(bannedUntilNoon)))
      );

      assert.include(after.permissions, "post:publish");
    })
  );

  it.effect("refuses someone who is not a member", () =>
    Effect.gen(function* notMember() {
      const failure = yield* resolve.pipe(
        Effect.provide(directoryWith(Option.none())),
        Effect.flip
      );

      assert.strictEqual(failure._tag, "NotAMember");
    })
  );
});
