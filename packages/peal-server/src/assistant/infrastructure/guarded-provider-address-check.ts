import { Effect, Layer } from "effect";

import { ProviderAddressCheck } from "#assistant/application/ports/provider-address-check.ts";
import { ProviderAddressNotPublic } from "#assistant/application/provider-address-not-public.ts";
import { checkProviderAddress } from "#assistant/domain/image-provider.ts";
import { ProviderAddressRejected } from "#assistant/domain/provider-address-rejected.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";

/**
 * ProviderAddressCheck on the domain's rules, then the outbound guard, as every
 * call to the provider will be checked: an address the guard refuses for
 * its scheme or port is `notHttps`, a host that is not public or does not
 * resolve ProviderAddressNotPublic, and one that cannot be looked up for
 * the moment passes.
 */
export const GuardedProviderAddressCheck = Layer.effect(
  ProviderAddressCheck,
  Effect.gen(function* GuardedProviderAddressCheck() {
    const guard = yield* OutboundGuard;

    return ProviderAddressCheck.of({
      check: Effect.fn("ProviderAddressCheck.check")(function* check(text) {
        const address = yield* Effect.fromResult(checkProviderAddress(text));

        yield* guard.check(new URL(address)).pipe(
          // The guard's span names the host it refuses: a workspace's
          // provider is never traced by its host.
          Effect.withTracerEnabled(false),
          Effect.catchTag(
            "OutboundRequestRefused",
            ({
              reason,
            }): Effect.Effect<
              void,
              ProviderAddressNotPublic | ProviderAddressRejected
            > => {
              if (reason === "lookupFailed") {
                return Effect.void;
              }

              return reason === "notHttps"
                ? Effect.fail(new ProviderAddressRejected({ reason }))
                : Effect.fail(new ProviderAddressNotPublic({ reason }));
            }
          )
        );

        return address;
      }),
    });
  })
);
