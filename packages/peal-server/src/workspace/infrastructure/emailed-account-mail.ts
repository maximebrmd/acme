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

    const home = (locale: Locale) => `${publicUrl}${localePrefix(locale)}`;

    return AccountMail.of({
      deleted: ({ email, locale, subscriptionsCancelled }) =>
        FiberSet.run(
          fibers,
          emails.send({
            _tag: "AccountDeleted",
            locale,
            subscriptionsCancelled,
            to: email,
            url: home(locale),
          })
        ).pipe(Effect.asVoid),
      exported: ({ email, locale, via }) =>
        FiberSet.run(
          fibers,
          emails.send({
            _tag: "DataExported",
            locale,
            to: email,
            url: `${home(locale)}/app/account`,
            via,
          })
        ).pipe(Effect.asVoid),
      workspaceDeleted: ({
        email,
        locale,
        subscriptionsCancelled,
        workspaceName,
      }) =>
        FiberSet.run(
          fibers,
          emails.send({
            _tag: "WorkspaceDeleted",
            locale,
            subscriptionsCancelled,
            to: email,
            url: `${home(locale)}/app`,
            workspaceName,
          })
        ).pipe(Effect.asVoid),
    });
  })
);
