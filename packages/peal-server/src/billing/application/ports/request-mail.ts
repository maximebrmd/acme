import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { ContractRequest } from "#billing/domain/contract-request.ts";

/**
 * The acknowledgement of a request, by email to the address its sender
 * gave, in the language of the page it came from: when it was received and
 * what it said, then what became of it. For one that awaits its
 * confirmation, the link that applies it, made with `token`.
 */
export class RequestMail extends Context.Service<
  RequestMail,
  {
    /** Whether the mail transport took the email. */
    readonly acknowledge: (
      request: ContractRequest,
      token: Option.Option<string>
    ) => Effect.Effect<boolean>;
  }
>()("peal-server/billing/application/RequestMail") {}
