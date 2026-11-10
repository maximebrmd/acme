"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import type { ChoosableAccount, Platform } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  channelsChanged,
  chooseAccounts,
  failureOf,
} from "#channels/channels-api.ts";
import type { ChannelErrorKey } from "#channels/channels-api.ts";
import { useConnect } from "#channels/use-connect.ts";
import { useOfferUpgrade } from "#components/billing/use-offer-upgrade.ts";
import {
  AccountPickerView,
  toggled,
} from "#components/channels/account-picker-view.tsx";
import { Link, useRouter } from "#i18n/navigation.ts";

interface AccountPickerProps {
  readonly accounts: readonly ChoosableAccount[];
  readonly platform: Platform;
  readonly selection: string;
  readonly workspaceId: string;
}

// Sends the member's choice, then returns to the channels. After a
// failure, the member tries again, or signs in again for a new choice.
export const AccountPicker = ({
  accounts,
  platform,
  selection,
  workspaceId,
}: AccountPickerProps) => {
  const t = useTranslations("MetaChannels");
  const router = useRouter();
  const choose = useAtomSet(chooseAccounts, { mode: "promiseExit" });
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [error, setError] = useState<ChannelErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const signIn = useConnect(workspaceId, platform);
  const offerUpgrade = useOfferUpgrade();

  const handleToggle = (accountId: string, checked: boolean) => {
    setSelected((before) => toggled(accounts, before, accountId, checked));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const exit = await choose({
        params: { platform, workspaceId },
        payload: { accountIds: [...selected], selection },
        reactivityKeys: channelsChanged(workspaceId),
      });

      if (exit._tag === "Success") {
        toast.success(t("connected", { count: exit.value.length }));
        router.replace(`/app/${workspaceId}/channels`);

        return;
      }

      setError(Option.getOrElse(failureOf(exit), () => "unknown" as const));
      offerUpgrade(exit, workspaceId);
    });
  };

  return (
    <AccountPickerView
      accounts={accounts}
      cancel={
        <Button
          variant="outline"
          render={<Link href={`/app/${workspaceId}/channels`} />}
          nativeButton={false}
        >
          {t("cancel")}
        </Button>
      }
      error={signIn.error ?? error}
      isPending={isPending || signIn.isPending}
      onSubmit={handleSubmit}
      onToggle={handleToggle}
      platform={platform}
      selected={selected}
      startOver={
        <Button
          type="button"
          variant="outline"
          disabled={signIn.isPending}
          focusableWhenDisabled
          onClick={() => {
            signIn.start({});
          }}
        >
          {signIn.isPending ? t("connecting") : t("startOver")}
        </Button>
      }
    />
  );
};
