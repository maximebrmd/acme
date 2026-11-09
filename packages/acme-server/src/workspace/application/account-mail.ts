import { Context } from "effect";
import type { Effect } from "effect";

import type { Locale } from "#shared/domain/locale.ts";

/** Emails about the account itself. They never fail the request. */
export class AccountMail extends Context.Service<
  AccountMail,
  {
    /** Confirms, to the address it had, that the account is deleted. */
    readonly deleted: (to: {
      readonly email: string;
      readonly locale: Locale;
    }) => Effect.Effect<void>;
  }
>()("acme-server/workspace/application/AccountMail") {}
