import { Layer } from "effect";

import { ContractRequestsHandlers } from "./handlers.ts";
import { ContractRequestIntakeLive } from "./intake.ts";

/**
 * The cancel and withdraw functions, and the intake in front of them. They
 * need billing's use cases and the workspace context's captcha.
 */
export const ContractRequestsLive = ContractRequestsHandlers.pipe(
  Layer.provideMerge(ContractRequestIntakeLive)
);
