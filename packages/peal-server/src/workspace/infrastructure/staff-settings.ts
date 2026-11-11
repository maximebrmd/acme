import { Config, Effect, Layer } from "effect";

import { StaffSettings } from "#workspace/application/staff-settings.ts";

/**
 * `PEAL_STAFF_TWO_STEP`: whether the staff console is refused to staff
 * whose own account does not have two-step verification on. Unset or
 * `false`, it is not required. Read when the server starts.
 */
export const staffTwoStepConfig = Config.Boolean("PEAL_STAFF_TWO_STEP").pipe(
  Config.withDefault(false)
);

export const StaffSettingsLive = Layer.effect(
  StaffSettings,
  Effect.gen(function* StaffSettingsLive() {
    return StaffSettings.of({ twoStepRequired: yield* staffTwoStepConfig });
  })
);
