"use client";

import { useLocale, useTranslations } from "next-intl";
import { signUpInvitationHeader } from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";
import type { ReactNode, SubmitEvent } from "react";

import { authClient } from "#auth/client.ts";
import { authErrorKey } from "#auth/errors.ts";
import type { AuthErrorKey } from "#auth/errors.ts";
import { FormError } from "#components/auth/form-error.tsx";
import { FormField } from "#components/auth/form-field.tsx";
import { useCaptcha } from "#components/auth/turnstile-field.tsx";
import { getPathname } from "#i18n/navigation.ts";

// A legal page's link, its whole sentence, as on the billing page.
const LegalLink = ({
  children,
  href,
}: {
  readonly children: ReactNode;
  readonly href: string;
}) => (
  <a className="underline underline-offset-4" href={href}>
    {children}
  </a>
);

// Creates the account, in the page's language, which its emails will use.
// The confirmation link signs the new user in on the verify-email page.
// With a Turnstile site key, the server wants the widget's token too; from
// an invitation's page, the invitation's id goes with it. Creating the
// account accepts the terms, which the form says under its button, with
// links to the terms and privacy policy the server names.
export const SignUpForm = ({
  captchaSiteKey,
  invitationId,
  privacyUrl,
  termsUrl,
}: {
  readonly captchaSiteKey: string | null;
  /**
   * The invitation the visitor came from, which a server where accounts are
   * made by invitation needs with the address it went to.
   */
  readonly invitationId: string | null;
  readonly privacyUrl: string | null;
  readonly termsUrl: string | null;
}) => {
  const t = useTranslations("SignUpPage");
  const fields = useTranslations("Auth");
  const locale = useLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const captcha = useCaptcha(captchaSiteKey);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const headers = new Headers(captcha.headers);

    if (invitationId !== null) {
      headers.set(signUpInvitationHeader, invitationId);
    }

    startTransition(async () => {
      const result = await authClient.signUp.email({
        callbackURL: getPathname({ href: "/verify-email", locale }),
        email,
        fetchOptions: { headers },
        locale,
        name,
        password,
      });

      // The token is spent, whatever the answer.
      captcha.reset();

      if (result.error === null) {
        setError(null);
        setSentTo(email);
      } else {
        setError(authErrorKey(result.error));
      }
    });
  };

  if (sentTo !== null) {
    return (
      <Alert>
        <AlertTitle>{t("checkInbox")}</AlertTitle>
        <AlertDescription>{t("sent", { email: sentTo })}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormError error={error} />
      <FormField
        id="name"
        type="text"
        autoComplete="name"
        label={fields("name")}
        value={name}
        onChange={setName}
      />
      <FormField
        id="email"
        type="email"
        autoComplete="email"
        label={fields("email")}
        value={email}
        onChange={setEmail}
      />
      <FormField
        id="password"
        type="password"
        autoComplete="new-password"
        label={fields("password")}
        hint={fields("passwordHint")}
        minLength={12}
        value={password}
        onChange={setPassword}
      />
      {captcha.widget}
      <Button
        type="submit"
        disabled={isPending || !captcha.ready}
        focusableWhenDisabled
      >
        {isPending ? t("submitting") : t("submit")}
      </Button>
      <p className="text-muted-foreground text-xs">
        {termsUrl === null ? (
          t("acceptTerms")
        ) : (
          <LegalLink href={termsUrl}>{t("acceptTerms")}</LegalLink>
        )}
        {privacyUrl === null ? null : (
          <>
            {" "}
            <LegalLink href={privacyUrl}>{t("privacy")}</LegalLink>
          </>
        )}
      </p>
    </form>
  );
};
