import { Context } from "effect";
import type { Effect } from "effect";

import type { ShortCode } from "#shortlinks/domain/short-code.ts";

/** Draws new short codes at random, so use cases never call `crypto`. */
export class ShortCodes extends Context.Service<
  ShortCodes,
  { readonly draw: Effect.Effect<ShortCode> }
>()("peal-server/shortlinks/application/ShortCodes") {}
