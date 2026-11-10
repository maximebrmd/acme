import { Effect } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Api } from "peal-contract";
import type { ContractFunctions } from "peal-contract";
import { cache } from "react";

import { serverUrl } from "#api/server-url.ts";

const off: ContractFunctions = { enabled: false, turnstileSiteKey: null };

const readFunctions = Effect.fn("contractFunctions")(function* readFunctions() {
  const client = yield* HttpApiClient.make(Api, { baseUrl: yield* serverUrl });

  return yield* client.contractRequests.functions();
}, Effect.provide(FetchHttpClient.layer));

/**
 * For Server Components: whether this server sells subscriptions, so has
 * the functions to cancel a contract and to withdraw from one, and the
 * Turnstile site key their form shows its widget with. Read once per
 * request. When the server cannot tell, the page links to nothing it could
 * not serve.
 */
export const contractFunctions = cache(
  async (): Promise<ContractFunctions> =>
    await Effect.runPromise(
      readFunctions().pipe(
        Effect.timeout("5 seconds"),
        Effect.catchCause((cause) =>
          Effect.logWarning(
            "The contract functions' settings could not be read",
            cause
          ).pipe(Effect.as(off))
        )
      )
    )
);
