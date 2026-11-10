import { Config, Effect, Layer } from "effect";

import { PartnerSettings } from "#workspace/application/partner-settings.ts";

/**
 * `PEAL_PARTNER_SELF_SERVICE`: whether a workspace's owners and admins may
 * open a partner account themselves. Unset or `false`, only the server's
 * staff open one, from the staff console. Read when the server starts.
 */
export const partnerSelfServiceConfig = Config.Boolean(
  "PEAL_PARTNER_SELF_SERVICE"
).pipe(Config.withDefault(false));

export const PartnerSettingsLive = Layer.effect(
  PartnerSettings,
  Effect.gen(function* PartnerSettingsLive() {
    return PartnerSettings.of({
      selfService: yield* partnerSelfServiceConfig,
    });
  })
);
