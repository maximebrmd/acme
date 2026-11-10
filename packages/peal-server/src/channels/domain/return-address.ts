import { Option } from "effect";

import type { ConnectLink } from "./connect-link.ts";

/** How a hosted page ended, as the return address tells it. */
export type ReturnStatus = "cancelled" | "connected" | "failed";

/**
 * Where a hosted page sends the browser once it is done: the link's return
 * address with the link's id and how it ended, as `peal_link` and
 * `peal_status`, replacing any the address had under those names. Nothing
 * secret, and nothing to trust: whoever receives it reads the link through
 * the API, with credentials of its own, to know what was connected. None
 * for a link without a return address.
 */
export const returnAddressOf = (
  link: ConnectLink,
  status: ReturnStatus
): Option.Option<string> =>
  link.returnUrl.pipe(
    Option.filter((address) => URL.canParse(address)),
    Option.map((address) => {
      const url = new URL(address);

      url.searchParams.set("peal_link", link.id);
      url.searchParams.set("peal_status", status);

      return url.href;
    })
  );
