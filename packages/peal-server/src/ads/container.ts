import { Layer } from "effect";

import { AdConnections } from "#ads/application/ad-connections.ts";
import { AdAllowance } from "#ads/application/ports/ad-allowance.ts";
import { SpendAuthorizations } from "#ads/application/spend-authorizations.ts";

/**
 * The ads context's use cases on `adapters`, which provide its ports: the
 * ad networks, the stores, the grants' secrets and the notices. No plan
 * limits ad accounts unless the adapters bring an AdAllowance. Needs Ids.
 */
export const adsWith = <ROut, E, R>(adapters: Layer.Layer<ROut, E, R>) =>
  Layer.mergeAll(AdConnections.layer, SpendAuthorizations.layer).pipe(
    Layer.provideMerge(adapters),
    Layer.provide(AdAllowance.layerUnmetered)
  );
