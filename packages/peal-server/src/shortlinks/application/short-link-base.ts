import type { Option } from "effect";
import { Context } from "effect";

import { codeLength } from "#shortlinks/domain/short-code.ts";

/**
 * Where this server's short links live (`PEAL_SHORT_LINK_BASE`): an
 * address ending in `/` that a code follows. None turns the feature off.
 */
export class ShortLinkBase extends Context.Service<
  ShortLinkBase,
  { readonly base: Option.Option<URL> }
>()("peal-server/shortlinks/application/ShortLinkBase") {}

/** How many characters a code has, for other contexts. */
export { codeLength as shortCodeLength } from "#shortlinks/domain/short-code.ts";

/** A code's full short address under `base`. */
export const shortUrlOf = (base: URL, code: string): string =>
  `${base.href}${code}`;

/** How long a short address is under `base`, in UTF-16 code units. */
export const shortLengthOf = (base: URL): number =>
  base.href.length + codeLength;
