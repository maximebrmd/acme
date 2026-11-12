import { Context } from "effect";
import type { Effect } from "effect";

import type { ProviderAddressNotPublic } from "#assistant/application/provider-address-not-public.ts";
import type { ProviderAddress } from "#assistant/domain/image-provider.ts";
import type { ProviderAddressRejected } from "#assistant/domain/provider-address-rejected.ts";

/**
 * Checks the address a member types for the workspace's image provider,
 * when it is saved: the domain's rules (HTTPS, or HTTP outside
 * production; no credentials, query or fragment), then whether the
 * outbound guard would let a request reach it now, so a private or
 * unknown host is refused as it is typed rather than at the first image.
 * A host that cannot be looked up for the moment passes: every call
 * checks again.
 */
export class ProviderAddressCheck extends Context.Service<
  ProviderAddressCheck,
  {
    readonly check: (
      text: string
    ) => Effect.Effect<
      ProviderAddress,
      ProviderAddressNotPublic | ProviderAddressRejected
    >;
  }
>()("peal-server/assistant/application/ProviderAddressCheck") {}
