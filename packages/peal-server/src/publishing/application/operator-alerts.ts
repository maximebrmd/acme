import { Context } from "effect";
import type { Effect } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";

/**
 * What publishing tells the server's operator, who alone can fix it: the
 * platform refuses every call of the server's app until its account with
 * the platform is paid for (`operatorRefusalCodes`).
 */
export class OperatorAlerts extends Context.Service<
  OperatorAlerts,
  {
    /**
     * An attempt on the channel was refused with the operator code `code`.
     * Told at every refused attempt: whoever alerts decides how often the
     * operator hears of it. Never fails, as publishing must go on.
     */
    readonly appRefused: (refusal: {
      readonly channelId: ChannelId;
      readonly code: string;
    }) => Effect.Effect<void>;
  }
>()("peal-server/publishing/application/OperatorAlerts") {}
