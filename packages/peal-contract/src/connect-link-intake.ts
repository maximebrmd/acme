import { HttpApiMiddleware } from "effect/http-api";

import { Forbidden } from "./forbidden.ts";
import { TooManyConnectAttempts } from "./too-many-connect-attempts.ts";

/**
 * What the hosted connect pages' requests pass before they are read, as
 * they need no credentials but a link's token: a number per client address
 * and hour, and, for anything but a read, an `Origin` the server trusts.
 */
export class ConnectLinkIntake extends HttpApiMiddleware.Service<ConnectLinkIntake>()(
  "peal-contract/ConnectLinkIntake",
  { error: [TooManyConnectAttempts, Forbidden] }
) {}
