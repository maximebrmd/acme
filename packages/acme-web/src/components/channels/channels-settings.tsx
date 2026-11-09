"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { Channel } from "acme-contract";
import { Alert, AlertDescription } from "acme-ui/components/alert";
import { Button } from "acme-ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "acme-ui/components/card";
import { Skeleton } from "acme-ui/components/skeleton";
import { constVoid } from "effect/Function";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { channelsOf } from "#channels/channels-api.ts";
import { ChannelRow } from "#components/channels/channel-row.tsx";
import { ConnectForms } from "#components/channels/connect-forms.tsx";

interface ChannelListProps {
  readonly canConnect: boolean;
  readonly canDisconnect: boolean;
  readonly channels: readonly Channel[];
  readonly workspaceId: string;
}

const ChannelList = ({
  canConnect,
  canDisconnect,
  channels,
  workspaceId,
}: ChannelListProps) => {
  const t = useTranslations("ChannelsPage");

  return channels.length === 0 ? (
    <p className="text-muted-foreground text-sm">{t("empty")}</p>
  ) : (
    <ul className="divide-y">
      {channels.map((channel) => (
        <ChannelRow
          key={channel.id}
          channel={channel}
          workspaceId={workspaceId}
          canConnect={canConnect}
          canDisconnect={canDisconnect}
        />
      ))}
    </ul>
  );
};

const LoadFailed = ({ onRetry }: { readonly onRetry: () => void }) => {
  const t = useTranslations("ChannelsPage");

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertDescription>{t("loadFailed")}</AlertDescription>
      </Alert>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
};

const Loading = () => (
  <div className="flex flex-col gap-3" aria-busy>
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
  </div>
);

interface LoadedChannelsProps {
  readonly canConnect: boolean;
  readonly canDisconnect: boolean;
  readonly workspaceId: string;
}

// The list, fetched by the browser: the server has no session to fetch it
// with, so it never renders this.
const LoadedChannels = ({
  canConnect,
  canDisconnect,
  workspaceId,
}: LoadedChannelsProps) => {
  const channels = useAtomValue(channelsOf(workspaceId));
  const handleRetry = useAtomRefresh(channelsOf(workspaceId));

  if (AsyncResult.isSuccess(channels)) {
    return (
      <ChannelList
        channels={channels.value}
        workspaceId={workspaceId}
        canConnect={canConnect}
        canDisconnect={canDisconnect}
      />
    );
  }

  return AsyncResult.isFailure(channels) ? (
    <LoadFailed onRetry={handleRetry} />
  ) : (
    <Loading />
  );
};

// Whether the page runs in the browser: false on the server and while
// hydrating, so both render the same, then true.
const ignoreChanges = () => constVoid;

const inBrowser = () => true;

const onServer = () => false;

interface ChannelsSettingsProps {
  readonly canConnect: boolean;
  readonly canDisconnect: boolean;
  readonly workspaceId: string;
}

// The workspace's channels, loaded by the browser with the member's session,
// and the forms that connect more.
export const ChannelsSettings = ({
  canConnect,
  canDisconnect,
  workspaceId,
}: ChannelsSettingsProps) => {
  const t = useTranslations("ChannelsPage");
  const hydrated = useSyncExternalStore(ignoreChanges, inBrowser, onServer);

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("listTitle")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hydrated ? (
            <LoadedChannels
              workspaceId={workspaceId}
              canConnect={canConnect}
              canDisconnect={canDisconnect}
            />
          ) : (
            <Loading />
          )}
        </CardContent>
      </Card>
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("connectTitle")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {canConnect ? t("connectDescription") : t("noPermission")}
          </p>
        </div>
        {canConnect ? <ConnectForms workspaceId={workspaceId} /> : null}
      </section>
    </div>
  );
};
