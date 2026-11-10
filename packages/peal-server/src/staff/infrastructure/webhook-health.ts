import { Option } from "effect";
import type { DateTime } from "effect";

import type { WebhookHealth } from "#staff/application/ports/workspace-health.ts";

// A webhook endpoint as the webhooks context's oversight hands it over:
// what this reads of it.
interface OverseenEndpoint {
  readonly eventTypes: readonly string[];
  readonly failingSince: Option.Option<DateTime.Utc>;
  readonly id: string;
  readonly status:
    | { readonly _tag: "enabled" }
    | {
        readonly _tag: "disabled";
        readonly reason: WebhookHealth["disabledReason"] extends Option.Option<
          infer Reason
        >
          ? Reason
          : never;
      };
  readonly url: string;
}

/**
 * What staff see of a webhook endpoint: the host its deliveries go to,
 * whether it is on, why not, since when it fails and how many events it
 * subscribes to. Never its whole address, whose path or query may hold a
 * secret of the receiver's, its description or its signing secret.
 */
export const webhookHealthOf = (endpoint: OverseenEndpoint): WebhookHealth => ({
  disabledReason:
    endpoint.status._tag === "disabled"
      ? Option.some(endpoint.status.reason)
      : Option.none(),
  enabled: endpoint.status._tag === "enabled",
  eventTypes: endpoint.eventTypes.length,
  failingSince: endpoint.failingSince,
  host: new URL(endpoint.url).host,
  id: endpoint.id,
});
