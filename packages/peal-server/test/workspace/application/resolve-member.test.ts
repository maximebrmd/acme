import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import type { Membership } from "#workspace/domain/membership.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

// An account without two-step verification, in a workspace that does not
// require it.
const noTwoStep = { enabled: false, required: false };

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
    ),
    Layer.provide(PartnerOwnership.layerNone)
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
  twoStep: noTwoStep,
};

// An owner of a workspace that requires two-step verification.
const standing = (enabled: boolean) =>
  directoryWith(
    Option.some({
      ban: Option.none(),
      role: "owner",
      twoStep: { enabled, required: true },
    })
  );

describe(ResolveMember, () => {
  it.effect("reads the member's role on every request", () =>
    Effect.gen(function* resolves() {
      const actor = yield* resolve.pipe(
        Effect.provide(
          directoryWith(
            Option.some({
              ban: Option.none(),
              role: "viewer",
              twoStep: noTwoStep,
            })
          )
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

  it.effect(
    "refuses a member without two-step verification where it is required, and lets them in once it is on",
    () =>
      Effect.gen(function* twoStep() {
        const refused = yield* resolve.pipe(
          Effect.provide(standing(false)),
          Effect.flip
        );

        assert.strictEqual(refused._tag, "TwoStepRequired");

        const actor = yield* resolve.pipe(Effect.provide(standing(true)));

        assert.include(actor.permissions, "organization:secure");
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
