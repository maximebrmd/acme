import { Effect, Layer } from "effect";

import { ShortLinkDefaults } from "#publishing/application/short-link-defaults.ts";
import { ShortLinkSettings } from "#shortlinks/application/short-link-settings.ts";

/**
 * ShortLinkDefaults through the shortlinks context: the workspace's
 * default, off on a server without short links. Needs ShortLinkSettings.
 */
export const ShortLinksShortLinkDefaults = Layer.effect(
  ShortLinkDefaults,
  Effect.gen(function* ShortLinksShortLinkDefaults() {
    const settings = yield* ShortLinkSettings;

    return ShortLinkDefaults.of({
      byDefault: (workspaceId) => settings.defaultFor(workspaceId),
    });
  })
);
