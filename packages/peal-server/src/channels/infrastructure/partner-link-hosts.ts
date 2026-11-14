import { Effect, Layer, Option } from "effect";

import { LinkHosts } from "#channels/application/link-hosts.ts";
import type { LinkHost } from "#channels/application/link-hosts.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";

/**
 * LinkHosts, as the workspace context says whose each workspace is: the
 * partner's name, logo and return origins for a workspace a partner owns
 * and for a partner's home workspace, the workspace's own name for any
 * other.
 */
export const PartnerLinkHosts = Layer.effect(
  LinkHosts,
  Effect.gen(function* PartnerLinkHosts() {
    const ownership = yield* PartnerOwnership;

    return LinkHosts.of({
      allowsReturnTo: (workspaceId, returnUrl) =>
        ownership.allowsReturnTo(workspaceId, returnUrl),
      of: (workspaceId) =>
        ownership.presentedAs(workspaceId).pipe(
          Effect.map(
            Option.map(({ accentColor, logoUrl, name }): LinkHost => ({
              accentColor,
              logoUrl,
              name,
            }))
          )
        ),
    });
  })
);
