"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { HostedLink, Platform } from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Avatar, AvatarFallback, AvatarImage } from "peal-ui/components/avatar";
import { Button, buttonVariants } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { useId } from "react";
import type { ComponentProps, ReactNode, SubmitEvent } from "react";

import type { HostedErrorKey } from "#connect-link/hosted-api.ts";

// The hosted pages' views, apart from their state, so tests render each
// one. Everything a visitor reads here comes from the catalogues, but the
// name, the logo and the handle the link's host chose, which are shown as
// text and as an image from its own address, never as markup.

// The host's accent colour, when it is one the server keeps (`#RRGGBB`,
// checked against Peal's light surfaces there): anything else draws
// nothing, so the value never reaches a style as more than a colour.
const accentOf = (host: HostedLink["host"] | null): string | null =>
  host?.accentColor !== null &&
  host?.accentColor !== undefined &&
  /^#[0-9A-F]{6}$/iu.test(host.accentColor)
    ? host.accentColor
    : null;

/**
 * The frame of a hosted page: who asks, then what the page says. The
 * host's accent colour is a line along the card's top, above its logo
 * (DESIGN.md, "Hosted pages"): never text, nor a button.
 */
export const HostedCard = ({
  children,
  host,
  title,
}: {
  readonly children: ReactNode;
  readonly host: HostedLink["host"] | null;
  readonly title: string;
}) => {
  const accent = accentOf(host);

  return (
    <div
      className={`mx-auto flex w-full max-w-sm flex-col gap-6 rounded-lg border p-6${accent === null ? "" : " border-t-4 border-t-(--host-accent)"}`}
      style={accent === null ? undefined : { "--host-accent": accent }}
    >
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
};

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
  /** The platform the visitor is about to sign in at. */
  readonly chosen: Platform;
  readonly error: HostedErrorKey | null;
  readonly isPending: boolean;
  readonly link: HostedLink;
  readonly onChoose: (platform: Platform) => void;
  readonly onInput: (value: string) => void;
  readonly onStart: () => void;
  readonly value: string;
}

// A link for several platforms: each, connected or to connect, in one
// bordered list with a line between them.
const PlatformList = ({
  chosen,
  link,
  onChoose,
}: {
  readonly chosen: Platform;
  readonly link: HostedLink;
  readonly onChoose: (platform: Platform) => void;
}) => {
  const t = useTranslations("ConnectLink");

  return (
    <ul className="divide-y rounded-md border">
      {link.platforms.map(({ connected, platform }) => (
        <li
          key={platform}
          className="flex min-h-11 items-center justify-between gap-3 px-3 py-2"
        >
          <span className="font-medium">{t("platformName", { platform })}</span>
          {connected ? (
            <span className="text-muted-foreground text-sm">
              {t("platformConnected")}
            </span>
          ) : null}
          {!connected && platform !== chosen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChoose(platform);
              }}
            >
              {t("connectPlatform", { platform })}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
};

/**
 * What a link that waits shows: who asks, for which platform, what the
 * visitor is about to do, the server or handle the sign-in needs first,
 * and the way on, or back.
 */
export const HostedWelcome = ({
  chosen,
  error,
  isPending,
  link,
  onChoose,
  onInput,
  onStart,
  value,
}: WelcomeProps) => {
  const t = useTranslations("ConnectLink");
  const inputId = useId();
  const { host, reconnecting, returnTo } = link;
  const several = link.platforms.length > 1;
  const platform = chosen;

  // What the sign-in at the platform chosen needs first.
  const input =
    link.platforms.find((offered) => offered.platform === chosen)?.input ??
    link.input;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onStart();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p>
        {several ? t("asksSeveral", { host: host.name }) : null}
        {!several && reconnecting === null
          ? t("asks", { host: host.name, platform })
          : null}
        {!several && reconnecting !== null
          ? t("asksAgain", {
              handle: reconnecting,
              host: host.name,
              platform,
            })
          : null}
      </p>
      {several ? (
        <PlatformList chosen={chosen} link={link} onChoose={onChoose} />
      ) : null}
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

const noPlatforms: readonly Platform[] = [];

/**
 * What a sign-in that connected accounts shows: with the platforms the
 * link still waits on, a button to its page (`again`, the element it
 * renders as) to connect them, and no going back by itself.
 */
export const HostedConnected = ({
  again = null,
  handles,
  platform,
  remaining = noPlatforms,
  returnTo,
}: {
  readonly again?: ComponentProps<typeof Button>["render"] | null;
  readonly handles: readonly string[];
  readonly platform: Platform;
  readonly remaining?: readonly Platform[];
  readonly returnTo: string | null;
}) => {
  const t = useTranslations("ConnectLink");
  const format = useFormatter();
  const more = again !== null && remaining.length > 0;

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
        {more
          ? t("left", {
              count: remaining.length,
              platforms: format.list(
                remaining.map((left) => t("platformName", { platform: left })),
                { type: "conjunction" }
              ),
            })
          : null}
        {!more && returnTo === null ? t("mayClose") : null}
        {!more && returnTo !== null ? t("returning") : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {more ? <Button render={again}>{t("connectAnother")}</Button> : null}
        {returnTo === null ? null : (
          <ReturnLink
            label={t("continueBack")}
            returnTo={returnTo}
            variant={more ? "outline" : "default"}
          />
        )}
      </div>
    </output>
  );
};
