"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import type { Channel } from "peal-contract";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "peal-ui/components/alert-dialog";
import { Button } from "peal-ui/components/button";
import { useTransition } from "react";
import { toast } from "sonner";

import { useChannelErrorText } from "#channels/channel-error-text.ts";
import { channelName } from "#channels/channel-name.ts";
import {
  channelsChanged,
  disableChannel,
  enableChannel,
  failureOf,
} from "#channels/channels-api.ts";

interface ChannelPowerProps {
  readonly channel: Channel;
  readonly workspaceId: string;
}

// Turns a channel off, once the member read what that does, or back on.
// The channel the server answers says how turning it on ended: it posts
// again, or its account must be reconnected first.
export const ChannelPower = ({ channel, workspaceId }: ChannelPowerProps) => {
  const t = useTranslations("ChannelsPage");
  const errorText = useChannelErrorText();
  const disable = useAtomSet(disableChannel, { mode: "promiseExit" });
  const enable = useAtomSet(enableChannel, { mode: "promiseExit" });
  const [isChanging, startChange] = useTransition();
  const handle = channelName(channel);
  const isOff = channel.status._tag === "disabled";

  const request = {
    params: { channelId: channel.id, workspaceId },
    reactivityKeys: channelsChanged(workspaceId),
  };

  const handleTurnOn = () => {
    startChange(async () => {
      const exit = await enable(request);

      Option.match(failureOf(exit), {
        onNone: () => {
          if (exit._tag === "Success") {
            toast.success(
              t("power.turnedOn", {
                handle,
                status: exit.value.status._tag,
              })
            );
          }
        },
        onSome: (key) => {
          toast.error(errorText(key));
        },
      });
    });
  };

  const handleTurnOff = () => {
    startChange(async () => {
      const exit = await disable(request);

      Option.match(failureOf(exit), {
        onNone: () => {
          toast.success(t("power.turnedOff", { handle }));
        },
        onSome: (key) => {
          toast.error(errorText(key));
        },
      });
    });
  };

  if (isOff) {
    return (
      <Button
        size="sm"
        disabled={isChanging}
        focusableWhenDisabled
        aria-label={isChanging ? undefined : t("power.onAccount", { handle })}
        onClick={handleTurnOn}
      >
        {isChanging ? t("power.turningOn") : t("power.on")}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={isChanging}
            focusableWhenDisabled
            aria-label={
              isChanging ? undefined : t("power.offAccount", { handle })
            }
          />
        }
      >
        {isChanging ? t("power.turningOff") : t("power.off")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("power.offTitle", { handle })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("power.offDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleTurnOff}>
            {t("power.off")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
