import { Context } from "effect";

import type { Principal } from "./principal.ts";

/** Provided by the Authentication middleware to the endpoints behind it. */
export class CurrentPrincipal extends Context.Service<
  CurrentPrincipal,
  Principal
>()("peal-contract/CurrentPrincipal") {}
