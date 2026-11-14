"use client";

import { useAtomSet } from "@effect/atom-react";
import { DateTime, Option } from "effect";
import { useTranslations } from "next-intl";
import { isSocialChannel } from "peal-contract";
import type { Channel, ChannelStatus } from "peal-contract";
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
import { Avatar, AvatarFallback, AvatarImage } from "peal-ui/components/avatar";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { useTransition } from "react";
import { toast } from "sonner";

import { useChannelErrorText } from "#channels/channel-error-text.ts";
import {
  channelInitial,
  channelName,
  channelTitle,
} from "#channels/channel-name.ts";
import {
  channelsChanged,
  disconnectChannel,
  failureOf,
  reconnectChannel,
} from "#channels/channels-api.ts";
import { rememberConnection } from "#channels/pending-connection.ts";
import { ChannelPower } from "#components/channels/channel-power.tsx";
import { ReconnectWebsite } from "#components/channels/connect-website.tsx";
import { RenameChannel } from "#components/channels/rename-channel.tsx";

const badgeVariant = {
  active: "outline",
  disabled: "secondary",
  refreshNeeded: "destructive",
} as const satisfies Record<ChannelStatus["_tag"], string>;

// Connecting the channel's account again: a platform's sign-in, or a
// website's form for a new application password.
const ReconnectControl = ({
  channel,
  handle,
  needsReconnect,
  workspaceId,
}: {
  readonly channel: Channel;
  readonly handle: string;
  readonly needsReconnect: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ChannelsPage");
  const errorText = useChannelErrorText();
  const reconnect = useAtomSet(reconnectChannel, { mode: "promiseExit" });
  const [isReconnecting, startReconnect] = useTransition();
  const params = { channelId: channel.id, workspaceId };

  const handleReconnect = () => {
    startReconnect(async () => {
      const exit = await reconnect({ params, query: {} });

      Option.match(failureOf(exit), {
        onNone: () => {
          if (exit._tag === "Success" && isSocialChannel(channel)) {
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

  if (!isSocialChannel(channel)) {
    return (
      <ReconnectWebsite
        handle={channel.handle}
        needsReconnect={needsReconnect}
        workspaceId={workspaceId}
      />
    );
  }

  return (
    <Button
      variant={needsReconnect ? "default" : "outline"}
      size="sm"
      disabled={isReconnecting}
      focusableWhenDisabled
      onClick={handleReconnect}
      aria-label={
        isReconnecting ? undefined : t("reconnectAccount", { handle })
      }
    >
      {isReconnecting ? t("reconnecting") : t("reconnect")}
    </Button>
  );
};

interface ChannelRowProps {
  readonly canConnect: boolean;
  readonly canDisconnect: boolean;
  readonly channel: Channel;
  readonly workspaceId: string;
}

// One connected account: who it is, whether it posts, and what the member
// may do with it. The name the workspace gave it comes first; the platform's
// handle, and the name it shows there, stay beside it.
export const ChannelRow = ({
  canConnect,
  canDisconnect,
  channel,
  workspaceId,
}: ChannelRowProps) => {
  const t = useTranslations("ChannelsPage");
  const errorText = useChannelErrorText();
  const disconnect = useAtomSet(disconnectChannel, { mode: "promiseExit" });
  const [isDisconnecting, startDisconnect] = useTransition();
  const params = { channelId: channel.id, workspaceId };
  const name = channelTitle(channel);
  const handle = channelName(channel);

  // Under a name of the workspace's, the platform's own name is still told.
  const account =
    channel.label === null || channel.displayName === null
      ? channel.handle
      : `${channel.displayName} · ${channel.handle}`;

  const needsReconnect = channel.status._tag === "refreshNeeded";

  // Instagram's way in tells which sign-in reconnecting opens.
  const platformName =
    channel.connection === null
      ? t("platform", { platform: channel.platform })
      : t("platformVia", {
          connection: channel.connection,
          platform: channel.platform,
        });

  const handleDisconnect = () => {
    startDisconnect(async () => {
      const exit = await disconnect({
        params,
        reactivityKeys: channelsChanged(workspaceId),
      });

      Option.match(failureOf(exit), {
        onNone: () => {
          toast.success(t("disconnected", { handle }));
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
        <AvatarFallback>{channelInitial(channel)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{name}</span>
          <Badge variant={badgeVariant[channel.status._tag]}>
            {t(`status.${channel.status._tag}`)}
          </Badge>
        </div>
        <span className="text-muted-foreground truncate text-sm">
          {platformName} · {account}
        </span>
        {channel.status._tag === "disabled" ? (
          <span className="text-muted-foreground text-sm">
            {t("offHint", {
              reconnect: channel.status.refreshNeeded ? "yes" : "no",
              who: canConnect ? "you" : "other",
            })}
          </span>
        ) : null}
        {channel.tokenExpiresAt === null ? null : (
          <span className="text-muted-foreground text-sm">
            {t("expires", {
              date: DateTime.toDateUtc(channel.tokenExpiresAt),
            })}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {canConnect ? (
          <ChannelPower channel={channel} workspaceId={workspaceId} />
        ) : null}
        {canConnect ? (
          <RenameChannel channel={channel} workspaceId={workspaceId} />
        ) : null}
        {canConnect ? (
          <ReconnectControl
            channel={channel}
            handle={handle}
            needsReconnect={needsReconnect}
            workspaceId={workspaceId}
          />
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
                      : t("disconnectAccount", { handle })
                  }
                />
              }
            >
              {isDisconnecting ? t("disconnecting") : t("disconnect")}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("disconnectTitle", { handle })}
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
