import { Layer } from "effect";

import { ClientErrorsHandlers } from "./handlers.ts";
import { ClientErrorIntakeLive } from "./intake.ts";

/** The web app's error reports, and the intake in front of them. */
export const ClientErrorsLive = ClientErrorsHandlers.pipe(
  Layer.provideMerge(ClientErrorIntakeLive)
);
