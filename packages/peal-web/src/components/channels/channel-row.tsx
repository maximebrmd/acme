"use client";

import { useAtomSet } from "@effect/atom-react";
import type { Channel, ChannelStatus } from "acme-contract";
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
} from "acme-ui/components/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "acme-ui/components/avatar";
import { Badge } from "acme-ui/components/badge";
import { Button } from "acme-ui/components/button";
import { DateTime, Option } from "effect";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { useChannelErrorText } from "#channels/channel-error-text.ts";
import {
  channelsChanged,
  disconnectChannel,
  failureOf,
  reconnectChannel,
} from "#channels/channels-api.ts";
import { rememberConnection } from "#channels/pending-connection.ts";

const badgeVariant = {
  active: "outline",
  disabled: "secondary",
  refreshNeeded: "destructive",
} as const satisfies Record<ChannelStatus["_tag"], string>;

interface ChannelRowProps {
  readonly canConnect: boolean;
  readonly canDisconnect: boolean;
  readonly channel: Channel;
  readonly workspaceId: string;
}

// One connected account: who it is, whether it posts, and what the member
// may do with it.
export const ChannelRow = ({
  canConnect,
  canDisconnect,
  channel,
  workspaceId,
}: ChannelRowProps) => {
  const t = useTranslations("ChannelsPage");
  const errorText = useChannelErrorText();
  const reconnect = useAtomSet(reconnectChannel, { mode: "promiseExit" });
  const disconnect = useAtomSet(disconnectChannel, { mode: "promiseExit" });
  const [isReconnecting, startReconnect] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();
  const params = { channelId: channel.id, workspaceId };
  const name = channel.displayName ?? channel.handle;
  const needsReconnect = channel.status._tag === "refreshNeeded";

  const handleReconnect = () => {
    startReconnect(async () => {
      const exit = await reconnect({ params });

      Option.match(failureOf(exit), {
        onNone: () => {
          if (exit._tag === "Success") {
            rememberConnection({ platform: channel.platform, workspaceId });
            globalThis.location.assign(exit.value.authorizationUrl);
          }
        },
        onSome: (key) => {
          toast.error(errorText(key));
        },
      });
    });
  };

  const handleDisconnect = () => {
    startDisconnect(async () => {
      const exit = await disconnect({
        params,
        reactivityKeys: channelsChanged(workspaceId),
      });

      Option.match(failureOf(exit), {
        onNone: () => {
          toast.success(t("disconnected", { handle: channel.handle }));
        },
        onSome: (key) => {
          toast.error(errorText(key));
        },
      });
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-4 py-4">
      <Avatar size="lg">
        {channel.avatarUrl === null ? null : (
          <AvatarImage src={channel.avatarUrl} alt="" />
        )}
        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{name}</span>
          <Badge variant={badgeVariant[channel.status._tag]}>
            {t(`status.${channel.status._tag}`)}
          </Badge>
        </div>
        <span className="text-muted-foreground truncate text-sm">
          {t("platform", { platform: channel.platform })} · {channel.handle}
        </span>
        {channel.tokenExpiresAt === null ? null : (
          <span className="text-muted-foreground text-sm">
            {t("expires", {
              date: DateTime.toDateUtc(channel.tokenExpiresAt),
            })}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {canConnect ? (
          <Button
            variant={needsReconnect ? "default" : "outline"}
            size="sm"
            disabled={isReconnecting}
            focusableWhenDisabled
            onClick={handleReconnect}
            aria-label={
              isReconnecting
                ? undefined
                : t("reconnectAccount", { handle: channel.handle })
            }
          >
            {isReconnecting ? t("reconnecting") : t("reconnect")}
          </Button>
        ) : null}
        {canDisconnect ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isDisconnecting}
                  focusableWhenDisabled
                  aria-label={
                    isDisconnecting
                      ? undefined
                      : t("disconnectAccount", { handle: channel.handle })
                  }
                />
              }
            >
              {isDisconnecting ? t("disconnecting") : t("disconnect")}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("disconnectTitle", { handle: channel.handle })}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("disconnectDescription", { platform: channel.platform })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDisconnect}
                >
                  {t("disconnect")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </li>
  );
};
