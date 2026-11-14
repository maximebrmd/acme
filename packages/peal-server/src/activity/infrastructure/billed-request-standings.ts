import { Effect, Layer } from "effect";

import { RequestStandings } from "#activity/application/request-standings.ts";
import { ApiStandings } from "#billing/application/api-standings.ts";

/** The rate limit's standings, as the billing context tells them. */
export const BilledRequestStandings = Layer.effect(
  RequestStandings,
  Effect.gen(function* BilledRequestStandings() {
    const standings = yield* ApiStandings;

    return RequestStandings.of({
      ofPayer: standings.ofPayer,
      ofWorkspaces: standings.ofWorkspaces,
      withoutPaymentMethod: standings.withoutPaymentMethod,
    });
  })
);
