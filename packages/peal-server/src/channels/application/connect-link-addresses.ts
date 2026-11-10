import { Context } from "effect";
import type { Option, Redacted } from "effect";

import type { Locale } from "#shared/domain/locale.ts";

/** Where a connect link's hosted page is, on the web app. */
export class ConnectLinkAddresses extends Context.Service<
  ConnectLinkAddresses,
  {
    /**
     * Whether the pages are served over HTTPS, so the cookie a sign-in
     * sets is sent over nothing else.
     */
    readonly secure: boolean;
    /** The page a token opens, in `locale`, or in the visitor's own. */
    readonly pageOf: (
      token: Redacted.Redacted,
      locale: Option.Option<Locale>
    ) => string;
  }
>()("peal-server/channels/application/ConnectLinkAddresses") {}
