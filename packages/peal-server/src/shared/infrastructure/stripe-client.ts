import { Option, Redacted } from "effect";
import { Stripe } from "stripe";

import type { StripeSettings } from "#shared/infrastructure/stripe-settings.ts";

const protocolOf = (url: URL): "http" | "https" =>
  url.protocol === "http:" ? "http" : "https";

// The port an address names, or its protocol's.
const portOf = (url: URL): number => {
  if (url.port !== "") {
    return Number(url.port);
  }

  return url.protocol === "http:" ? 80 : 443;
};

/**
 * A Stripe client with the server's key, on Stripe's API or the one
 * STRIPE_API_URL names, such as stripe-mock in tests. `timeout`, in
 * milliseconds, bounds each request; Stripe's own default is 80 seconds.
 */
export const stripeClientOf = (
  settings: StripeSettings,
  options: { readonly timeout?: number } = {}
): Stripe =>
  new Stripe(Redacted.value(settings.secretKey), {
    ...options,
    ...Option.match(settings.apiUrl, {
      onNone: () => ({}),
      onSome: (url) => ({
        host: url.hostname,
        port: portOf(url),
        protocol: protocolOf(url),
      }),
    }),
  });
