import { Effect, FiberSet, Layer } from "effect";

import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";
import { defaultLocale } from "#shared/domain/locale.ts";
import type { Locale } from "#shared/domain/locale.ts";
import { AccountMail } from "#workspace/application/account-mail.ts";

import { AuthSettings } from "./auth/settings.ts";

const localePrefix = (locale: Locale): string =>
  locale === defaultLocale ? "" : `/${locale}`;

// Emails still on their way get this long when the server stops.
const drainTimeout = "10 seconds";

/**
 * Account emails through the notifications context's SendAuthEmail, sent
 * on a fiber of the layer so the request does not wait for them.
 */
export const EmailedAccountMail = Layer.effect(
  AccountMail,
  Effect.gen(function* EmailedAccountMail() {
    const emails = yield* SendAuthEmail;
    const { publicUrl } = yield* AuthSettings;
    const fibers = yield* FiberSet.make();

    yield* Effect.addFinalizer(() =>
      FiberSet.awaitEmpty(fibers).pipe(Effect.timeoutOption(drainTimeout))
    );

    return AccountMail.of({
      deleted: ({ email, locale }) =>
        FiberSet.run(
          fibers,
          emails.send({
            _tag: "AccountDeleted",
            locale,
            to: email,
            url: `${publicUrl}${localePrefix(locale)}`,
          })
        ).pipe(Effect.asVoid),
    });
  })
);
