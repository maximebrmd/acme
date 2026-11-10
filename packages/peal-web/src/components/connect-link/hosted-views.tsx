"use client";

import { useTranslations } from "next-intl";
import type { HostedLink, Platform } from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Avatar, AvatarFallback, AvatarImage } from "peal-ui/components/avatar";
import { Button, buttonVariants } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { useId } from "react";
import type { ReactNode, SubmitEvent } from "react";

import type { HostedErrorKey } from "#connect-link/hosted-api.ts";

// The hosted pages' views, apart from their state, so tests render each
// one. Everything a visitor reads here comes from the catalogues, but the
// name, the logo and the handle the link's host chose, which are shown as
// text and as an image from its own address, never as markup.

/** The frame of a hosted page: who asks, then what the page says. */
export const HostedCard = ({
  children,
  host,
  title,
}: {
  readonly children: ReactNode;
  readonly host: HostedLink["host"] | null;
  readonly title: string;
}) => (
  <div className="mx-auto flex w-full max-w-sm flex-col gap-6 rounded-xl border p-6">
    {host === null ? null : (
      <div className="flex items-center gap-3">
        <Avatar>
          {host.logoUrl === null ? null : (
            <AvatarImage
              src={host.logoUrl}
              alt=""
              referrerPolicy="no-referrer"
            />
          )}
          <AvatarFallback>{host.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{host.name}</span>
      </div>
    )}
    <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
    {children}
  </div>
);

/** A link to somewhere else than Peal: the address its host registered. */
export const ReturnLink = ({
  label,
  returnTo,
  variant = "outline",
}: {
  readonly label: string;
  readonly returnTo: string;
  readonly variant?: "default" | "outline";
}) => (
  <a href={returnTo} rel="noreferrer" className={buttonVariants({ variant })}>
    {label}
  </a>
);

/** Why a hosted step failed, in words. */
export const HostedError = ({ error }: { readonly error: HostedErrorKey }) => {
  const t = useTranslations("ConnectLink");

  return (
    <Alert variant="destructive">
      <AlertTitle>{t("failedTitle")}</AlertTitle>
      <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
    </Alert>
  );
};

interface WelcomeProps {
  readonly error: HostedErrorKey | null;
  readonly isPending: boolean;
  readonly link: HostedLink;
  readonly onInput: (value: string) => void;
  readonly onStart: () => void;
  readonly value: string;
}

/**
 * What a link that waits shows: who asks, for which platform, what the
 * visitor is about to do, the server or handle the sign-in needs first,
 * and the way on, or back.
 */
export const HostedWelcome = ({
  error,
  isPending,
  link,
  onInput,
  onStart,
  value,
}: WelcomeProps) => {
  const t = useTranslations("ConnectLink");
  const inputId = useId();
  const { host, input, platform, reconnecting, returnTo } = link;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onStart();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p>
        {reconnecting === null
          ? t("asks", { host: host.name, platform })
          : t("asksAgain", {
              handle: reconnecting,
              host: host.name,
              platform,
            })}
      </p>
      <p className="text-muted-foreground text-sm">
        {t("explains", { host: host.name, platform })}
      </p>
      {error === null ? null : <HostedError error={error} />}
      {input === "none" ? null : (
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>{t(`input.${input}.label`)}</Label>
          <Input
            id={inputId}
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby={`${inputId}-hint`}
            value={value}
            onChange={(event) => {
              onInput(event.target.value);
            }}
          />
          <p id={`${inputId}-hint`} className="text-muted-foreground text-sm">
            {t(`input.${input}.hint`)}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={isPending || (input !== "none" && value.trim() === "")}
          focusableWhenDisabled
        >
          {isPending ? t("opening") : t("continue", { platform })}
        </Button>
        {returnTo === null ? null : (
          <ReturnLink
            label={t("backTo", { host: host.name })}
            returnTo={returnTo}
          />
        )}
      </div>
    </form>
  );
};

/** What a link that is over shows: why, and the way back if it has one. */
export const HostedOver = ({
  host,
  returnTo,
  status,
}: {
  readonly host: HostedLink["host"];
  readonly returnTo: string | null;
  readonly status: Exclude<HostedLink["status"], "pending">;
}) => {
  const t = useTranslations("ConnectLink");

  return (
    <div className="flex flex-col gap-4">
      <p>{t(`over.${status}`, { host: host.name })}</p>
      {returnTo === null ? null : (
        <div>
          <ReturnLink
            label={t("backTo", { host: host.name })}
            returnTo={returnTo}
          />
        </div>
      )}
    </div>
  );
};

/** What a sign-in that connected accounts shows. */
export const HostedConnected = ({
  handles,
  platform,
  returnTo,
}: {
  readonly handles: readonly string[];
  readonly platform: Platform;
  readonly returnTo: string | null;
}) => {
  const t = useTranslations("ConnectLink");

  return (
    <output className="flex flex-col gap-4">
      <p>
        {t("connected", {
          count: handles.length,
          handles: handles.join(", "),
          platform,
        })}
      </p>
      <p className="text-muted-foreground text-sm">
        {returnTo === null ? t("mayClose") : t("returning")}
      </p>
      {returnTo === null ? null : (
        <div>
          <ReturnLink
            label={t("continueBack")}
            returnTo={returnTo}
            variant="default"
          />
        </div>
      )}
    </output>
  );
};
