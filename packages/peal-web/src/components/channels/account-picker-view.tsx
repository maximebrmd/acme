"use client";

import { useTranslations } from "next-intl";
import type { ChoosableAccount, Platform } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Avatar, AvatarFallback, AvatarImage } from "peal-ui/components/avatar";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import type { ReactNode, SubmitEvent } from "react";

import { useChannelErrorText } from "#channels/channel-error-text.ts";
import type { ChannelErrorKey } from "#channels/channels-api.ts";

const initialOf = (account: ChoosableAccount) =>
  (account.displayName ?? account.handle).replace(/^@/u, "").slice(0, 1);

/** The accounts chosen after a toggle, in the order they are listed. */
export const toggled = (
  accounts: readonly ChoosableAccount[],
  selected: readonly string[],
  accountId: string,
  checked: boolean
): readonly string[] =>
  accounts.flatMap(({ accountId: id }) =>
    (id === accountId ? checked : selected.includes(id)) ? [id] : []
  );

interface AccountPickerViewProps {
  readonly accounts: readonly ChoosableAccount[];
  readonly error: ChannelErrorKey | null;
  readonly isPending: boolean;
  readonly onSubmit: () => void;
  readonly onToggle: (accountId: string, checked: boolean) => void;
  readonly platform: Platform;
  readonly selected: readonly string[];
  /** A way back to the channels, without choosing. */
  readonly cancel: ReactNode;
  /** A new sign-in, offered once choosing failed. */
  readonly startOver: ReactNode;
}

/**
 * Whether a choice that failed this way can be made again: the server
 * keeps it when nothing was connected, and only a choice expired, already
 * made or offered elsewhere is gone, which signing in again replaces.
 */
export const isSpent = (error: ChannelErrorKey | null): boolean =>
  error === "invalidState";

/**
 * The accounts a sign-in reached, to tick those the workspace posts to: a
 * Facebook user's Pages, or the Instagram accounts linked to them. Those
 * the workspace has already are marked, and choosing them reconnects them.
 * A failure is shown with a new sign-in beside the button, which stays to
 * try again unless the choice is spent.
 */
export const AccountPickerView = ({
  accounts,
  cancel,
  error,
  isPending,
  onSubmit,
  onToggle,
  platform,
  selected,
  startOver,
}: AccountPickerViewProps) => {
  const t = useTranslations("MetaChannels");
  const errorText = useChannelErrorText();
  const spent = isSpent(error);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {t("chooseDescription", { platform })}
      </p>
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{errorText(error)}</p>
            {spent ? null : <p>{t("retry")}</p>}
          </AlertDescription>
        </Alert>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t("chooseTitle", { platform })}</legend>
        <ul className="flex flex-col gap-2">
          {accounts.map((account) => {
            const id = `account-${account.accountId}`;

            return (
              <li
                key={account.accountId}
                className="flex items-center gap-3 rounded-lg border p-2"
              >
                <Checkbox
                  id={id}
                  aria-describedby={`${id}-handle`}
                  checked={selected.includes(account.accountId)}
                  disabled={isPending || spent}
                  onCheckedChange={(checked) => {
                    onToggle(account.accountId, checked);
                  }}
                />
                <Avatar size="sm">
                  {account.avatarUrl === null ? null : (
                    <AvatarImage src={account.avatarUrl} alt="" />
                  )}
                  <AvatarFallback>{initialOf(account)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Label htmlFor={id}>
                    {account.displayName ?? account.handle}
                  </Label>
                  <span
                    id={`${id}-handle`}
                    className="text-muted-foreground truncate text-xs"
                  >
                    {account.handle}
                  </span>
                </div>
                {account.connected ? (
                  <Badge variant="outline">{t("alreadyConnected")}</Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={isPending || spent || selected.length === 0}
          focusableWhenDisabled
        >
          {isPending
            ? t("connectingChosen")
            : t("connectChosen", { count: selected.length })}
        </Button>
        {error === null ? null : startOver}
        {cancel}
      </div>
    </form>
  );
};
