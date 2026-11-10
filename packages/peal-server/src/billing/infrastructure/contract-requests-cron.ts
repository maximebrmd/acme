import { Cron, Duration, Effect } from "effect";
import { ClusterCron } from "effect/cluster";

import { ReceiveContractRequest } from "#billing/application/receive-contract-request.ts";

/**
 * Every five minutes: takes up the requests to cancel or withdraw whose
 * acknowledgement has not left, as when the mail or Stripe did not answer
 * or the server stopped. A failed run is logged and the next one catches
 * up.
 */
export const contractRequests = ClusterCron.make({
  cron: Cron.parseUnsafe("*/5 * * * *", "UTC"),
  execute: ReceiveContractRequest.use((requests) => requests.catchUp).pipe(
    Effect.tap((looked) =>
      looked === 0
        ? Effect.void
        : Effect.logInfo("Caught up on contract requests").pipe(
            Effect.annotateLogs({ looked })
          )
    ),
    Effect.catchCause((cause) =>
      Effect.logWarning("Catching up on contract requests failed", cause)
    )
  ),
  name: "billing.contract-requests",
  skipIfOlderThan: Duration.minutes(5),
});
