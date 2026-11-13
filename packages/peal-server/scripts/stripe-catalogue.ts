// Gives a Stripe account per-account pricing's catalogue: one meter, one
// product and one metered price in US dollars for each line of the rate
// card (src/billing/domain/rate-card.ts), under the lookup keys a server
// that bills checks when it starts. Run it once per Stripe account, sandbox
// first, from the repository root:
//
//   bun nx run peal-server:stripe-catalogue
//   bun nx run peal-server:stripe-catalogue -- --check
//
// It reads STRIPE_SECRET_KEY, STRIPE_API_URL and STRIPE_LOOKUP_KEY_PREFIX,
// as the server does. It makes what is missing, and replaces a price that
// bills otherwise by a new one, which takes its lookup key, leaving the
// old one active for the subscriptions on it. It prints what it made, by
// name and id, never the key. Running it again changes nothing. With
// --check it changes nothing, and fails when anything would change.
import { BunRuntime } from "@effect/platform-bun";
import { Console, Effect } from "effect";

import { catalogueOf } from "#billing/domain/catalogue.ts";
import { runCatalogue } from "#billing/infrastructure/stripe-catalogue.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import {
  catalogueKeysOf,
  stripeCatalogueConfig,
} from "#shared/infrastructure/stripe-settings.ts";

// Stripe's own default is 80 seconds a request.
const requestTimeout = 30_000;

const program = Effect.gen(function* stripeCatalogue() {
  const { apiUrl, prefix, secretKey } = yield* stripeCatalogueConfig;

  yield* runCatalogue({
    check: process.argv.includes("--check"),
    // A write sent again carries the same idempotency key, which the
    // client adds when it retries.
    client: stripeClientOf(
      { apiUrl, secretKey },
      { maxNetworkRetries: 2, timeout: requestTimeout }
    ),
    published: catalogueOf(catalogueKeysOf(prefix)),
    report: (line) => Console.log(line),
  });
});

BunRuntime.runMain(program);
