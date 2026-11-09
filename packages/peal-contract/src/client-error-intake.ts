import { HttpApiMiddleware } from "effect/http-api";

import { ClientErrorTooLarge } from "./client-error-too-large.ts";
import { TooManyClientErrors } from "./too-many-client-errors.ts";

/**
 * What error reports pass before they are read: a number per client address
 * and minute, and a size. It runs before the body is decoded.
 */
export class ClientErrorIntake extends HttpApiMiddleware.Service<ClientErrorIntake>()(
  "acme-contract/ClientErrorIntake",
  { error: [ClientErrorTooLarge, TooManyClientErrors] }
) {}
