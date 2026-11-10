import { HttpApiMiddleware } from "effect/http-api";

import { CaptchaRefused } from "./captcha-refused.ts";
import { TooManyContractRequests } from "./too-many-contract-requests.ts";

/**
 * What requests to cancel or withdraw pass before they are read, as they
 * need no credentials: a number per client address and hour, and, for a
 * new request on a server with Turnstile, the widget's token.
 */
export class ContractRequestIntake extends HttpApiMiddleware.Service<ContractRequestIntake>()(
  "peal-contract/ContractRequestIntake",
  { error: [CaptchaRefused, TooManyContractRequests] }
) {}
