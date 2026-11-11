import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";

import { UserIdSchema } from "#shared/domain/ids.ts";
import { AccountDirectory } from "#workspace/application/account-directory.ts";
import { StaffSettings } from "#workspace/application/staff-settings.ts";
import { StaffStanding } from "#workspace/application/staff-standing.ts";
import type { Ban } from "#workspace/domain/ban.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

const userId = UserIdSchema.make("0b6f2f3e-6c1e-4f0e-8a3b-1d2c3e4f5a60");

const standingWith = (
  found: Option.Option<{
    readonly ban: Option.Option<Ban>;
    readonly legal: boolean;
    readonly staff: boolean;
    readonly twoStepEnabled: boolean;
  }>,
  staffTwoStep = false
) =>
  StaffStanding.layer.pipe(
    Layer.provide(StaffSettings.layerTest(staffTwoStep)),
    Layer.provide(
      Layer.succeed(
        AccountDirectory,
        AccountDirectory.of({
          account: () => Effect.succeedNone,
          accounts: () => Effect.succeed({ items: [], total: 0 }),
          people: () => Effect.succeed([]),
          standing: () => Effect.succeed(found),
          workspace: () => Effect.succeedNone,
          workspaces: () => Effect.succeed({ items: [], total: 0 }),
        })
      )
    )
  );

const asStaff = Option.some({
  ban: Option.none(),
  legal: false,
  staff: true,
  twoStepEnabled: false,
});

const verdict = (principal: UserPrincipal) =>
  StaffStanding.use((standing) => standing.staffOf(principal)).pipe(
    Effect.match({ onFailure: ({ _tag }) => _tag, onSuccess: () => "staff" })
  );

const own = new UserPrincipal({ impersonatedBy: Option.none(), userId });

describe(StaffStanding, () => {
  it.effect("takes staff in their own session", () =>
    Effect.gen(function* takes() {
      assert.strictEqual(
        yield* verdict(own).pipe(Effect.provide(standingWith(asStaff))),
        "staff"
      );
    })
  );

  it.effect("refuses an OAuth client, and staff impersonating someone", () =>
    Effect.gen(function* refuses() {
      const oauth = new UserPrincipal({
        impersonatedBy: Option.none(),
        oauth: Option.some({
          clientId: "peal-cli",
          scopes: ["workspace:write"],
          workspaceId: Option.none(),
        }),
        userId,
      });

      const impersonating = new UserPrincipal({
        impersonatedBy: Option.some(
          UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7")
        ),
        userId,
      });

      for (const principal of [oauth, impersonating]) {
        assert.strictEqual(
          yield* verdict(principal).pipe(Effect.provide(standingWith(asStaff))),
          "NotStaff"
        );
      }
    })
  );

  it.effect("refuses accounts without the role, gone, or banned", () =>
    Effect.gen(function* refuses() {
      yield* TestClock.setTime(
        DateTime.toEpochMillis(DateTime.makeUnsafe("2026-11-09T12:00:00Z"))
      );

      const bannedUntilTomorrow = Option.some({
        ban: Option.some({
          expiresAt: Option.some(DateTime.makeUnsafe("2026-11-10T12:00:00Z")),
        }),
        legal: false,
        staff: true,
        twoStepEnabled: false,
      });

      for (const found of [
        Option.some({
          ban: Option.none(),
          legal: false,
          staff: false,
          twoStepEnabled: false,
        }),
        Option.none(),
        bannedUntilTomorrow,
      ]) {
        assert.strictEqual(
          yield* verdict(own).pipe(Effect.provide(standingWith(found))),
          "NotStaff"
        );
      }
    })
  );

  it.effect(
    "refuses staff without two-step verification where the server requires it, and only staff",
    () =>
      Effect.gen(function* twoStep() {
        const withIt = Option.some({
          ban: Option.none(),
          legal: false,
          staff: true,
          twoStepEnabled: true,
        });

        assert.strictEqual(
          yield* verdict(own).pipe(Effect.provide(standingWith(asStaff, true))),
          "StaffTwoStepRequired"
        );
        assert.strictEqual(
          yield* verdict(own).pipe(Effect.provide(standingWith(withIt, true))),
          "staff"
        );
        assert.strictEqual(
          yield* verdict(own).pipe(
            Effect.provide(
              standingWith(
                Option.some({
                  ban: Option.none(),
                  legal: false,
                  staff: false,
                  twoStepEnabled: false,
                }),
                true
              )
            )
          ),
          "NotStaff"
        );
        assert.strictEqual(
          yield* verdict(own).pipe(Effect.provide(standingWith(asStaff))),
          "staff"
        );
      })
  );
});
