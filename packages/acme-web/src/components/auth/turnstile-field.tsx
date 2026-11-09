"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

/** A Turnstile widget's token, and how to send it with a Better Auth call. */
export interface Captcha {
  /** The headers that carry the token, none when there is no widget. */
  readonly headers: Readonly<Record<string, string>>;
  /** Whether the form may be sent: the widget handed out a token, or there is none. */
  readonly ready: boolean;
  /** Forgets the token, which a call spent: the widget hands out a new one. */
  readonly reset: () => void;
  readonly widget: ReactNode;
}

const noCaptcha: Captcha = {
  headers: {},
  ready: true,
  reset: () => {
    // No widget, no token.
  },
  widget: null,
};

/**
 * Cloudflare Turnstile, when the server asks for it (`siteKey`), in the
 * page's language. A token works once, so the form resets it after every
 * call; the server's refusals read as the form's other errors.
 */
export const useCaptcha = (siteKey: string | null): Captcha => {
  const t = useTranslations("Captcha");
  const locale = useLocale();
  const turnstile = useRef<TurnstileInstance>(undefined);
  const [token, setToken] = useState<string | null>(null);

  if (siteKey === null) {
    return noCaptcha;
  }

  const forget = () => {
    setToken(null);
  };

  return {
    headers: token === null ? {} : { "x-captcha-response": token },
    ready: token !== null,
    reset: () => {
      setToken(null);
      turnstile.current?.reset();
    },
    widget: (
      <Turnstile
        ref={turnstile}
        siteKey={siteKey}
        options={{ language: locale, size: "flexible", theme: "auto" }}
        onSuccess={setToken}
        onExpire={forget}
        onError={forget}
        aria-label={t("label")}
      />
    ),
  };
};
