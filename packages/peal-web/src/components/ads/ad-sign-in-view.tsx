"use client";

import { useTranslations } from "next-intl";
import type { ReachableAdAccount } from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import type { ReactNode, SubmitEvent } from "react";

import type { AdsError } from "#ads/errors.ts";

import { AdsErrorAlert, useAdsErrorLines } from "./ads-error.tsx";

/** Where the callback page stands. */
export type AdSignInStep =
  // The tab's storage is being read, or the server is being asked.
  | { readonly _tag: "completing" }
  // The tab does not know which workspace the sign-in was for.
  | { readonly _tag: "lost" }
  // The address holds nothing Peal can hand to the server.
  | { readonly _tag: "unreadable" }
  | { readonly _tag: "failed"; readonly error: AdsError }
  | {
      readonly _tag: "choose";
      readonly accounts: readonly ReachableAdAccount[];
      /** Why connecting the chosen accounts failed last. */
      readonly error: AdsError | null;
      readonly pending: boolean;
      /** The network's ids of the accounts ticked. */
      readonly selected: readonly string[];
    };

/** Whether the member may tick an account: new to the workspace, and one Peal can connect. */
export const isChoosable = (account: ReachableAdAccount): boolean =>
  !account.connected && account.unsupported === null;

/** The accounts chosen after a toggle, in the order they are listed. */
export const toggledAccounts = (
  accounts: readonly ReachableAdAccount[],
  selected: readonly string[],
  externalId: string,
  checked: boolean
): readonly string[] =>
  accounts.flatMap((account) =>
    isChoosable(account) &&
    (account.externalId === externalId
      ? checked
      : selected.includes(account.externalId))
      ? [account.externalId]
      : []
  );

interface AdSignInViewProps {
  /** A way back to the ads page, or to the workspaces when it is unknown. */
  readonly back: ReactNode;
  readonly onSubmit: () => void;
  readonly onToggle: (externalId: string, checked: boolean) => void;
  readonly step: AdSignInStep;
}

const Failed = ({
  back,
  lines,
}: {
  readonly back: ReactNode;
  readonly lines: readonly string[];
}) => {
  const t = useTranslations("Ads.callback");

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertTitle>{t("failedTitle")}</AlertTitle>
        <AlertDescription>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </AlertDescription>
      </Alert>
      {back}
    </div>
  );
};

const Account = ({
  account,
  checked,
  disabled,
  onToggle,
}: {
  readonly account: ReachableAdAccount;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onToggle: (checked: boolean) => void;
}) => {
  const t = useTranslations("Ads");
  const id = `ad-account-${account.externalId}`;

  return (
    <li className="flex items-start gap-3 rounded-lg border p-2">
      <Checkbox
        id={id}
        className="mt-0.5"
        aria-describedby={`${id}-detail`}
        checked={checked}
        disabled={disabled || !isChoosable(account)}
        onCheckedChange={onToggle}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label htmlFor={id}>{account.name}</Label>
        <span id={`${id}-detail`} className="text-muted-foreground text-xs">
          {t("callback.detail", {
            currency: account.currency,
            status: t("accounts.status", { status: account.status }),
            timeZone:
              account.timeZone === null
                ? t("callback.noTimeZone")
                : account.timeZone.replaceAll("_", " "),
          })}
        </span>
        {account.unsupported === null ? null : (
          <span className="text-xs">
            {t("callback.unsupported", { reason: account.unsupported })}
          </span>
        )}
      </div>
      {account.connected ? (
        <Badge variant="outline">{t("callback.alreadyConnected")}</Badge>
      ) : null}
    </li>
  );
};

/**
 * The page an ad network sends the browser back to: the sign-in being
 * completed, why it failed, or the ad accounts it reaches, to tick those
 * the workspace connects. Those it connects already are marked, and those
 * Peal cannot connect say why.
 */
export const AdSignInView = ({
  back,
  onSubmit,
  onToggle,
  step,
}: AdSignInViewProps) => {
  const t = useTranslations("Ads.callback");
  const lines = useAdsErrorLines();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  if (step._tag === "completing") {
    return (
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {t("completing")}
      </p>
    );
  }

  if (step._tag === "lost") {
    return <Failed back={back} lines={[t("lost")]} />;
  }

  if (step._tag === "unreadable") {
    return <Failed back={back} lines={[t("unreadable")]} />;
  }

  if (step._tag === "failed") {
    return <Failed back={back} lines={lines(step.error)} />;
  }

  if (step.accounts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">{t("none")}</p>
        {back}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t("chooseDescription")}</p>
      <AdsErrorAlert error={step.error} />
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t("chooseTitle")}</legend>
        <ul className="flex flex-col gap-2">
          {step.accounts.map((account) => (
            <Account
              key={account.externalId}
              account={account}
              checked={step.selected.includes(account.externalId)}
              disabled={step.pending}
              onToggle={(checked) => {
                onToggle(account.externalId, checked);
              }}
            />
          ))}
        </ul>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={step.pending || step.selected.length === 0}
          focusableWhenDisabled
        >
          {step.pending
            ? t("connectingChosen")
            : t("connectChosen", { count: step.selected.length })}
        </Button>
        {back}
      </div>
    </form>
  );
};
