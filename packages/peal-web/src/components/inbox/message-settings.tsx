"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Channel, InboxMessageSettings } from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { channelsOf } from "#channels/channels-api.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import {
  messageSettings,
  messageSettingsChanged,
  setChannelMessages,
  setMessageApplication,
} from "#inbox/message-atoms.ts";

import { useChannelName } from "./inbox-views.tsx";

// The platforms whose direct messages Peal may read.
const messagePlatforms: ReadonlySet<string> = new Set(["mastodon", "bluesky"]);

/** One channel's switch: its messages read, or not. */
export const ChannelMessagesView = ({
  channel,
  disabled,
  on,
  onSwitch,
}: {
  readonly channel: Channel;
  readonly disabled: boolean;
  readonly on: boolean;
  readonly onSwitch: (on: boolean) => void;
}) => {
  const t = useTranslations("InboxMessages.settings");
  const channelName = useChannelName();

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <span className="flex items-center gap-2">
        <span className="font-medium">{channelName(channel)}</span>
        <Badge variant={on ? "default" : "outline"}>
          {on ? t("on") : t("off")}
        </Badge>
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => {
          onSwitch(!on);
        }}
      >
        {on ? t("turnOff") : t("turnOn")}
      </Button>
    </li>
  );
};

const Applications = ({
  disabled,
  onAllow,
  settings,
}: {
  readonly disabled: boolean;
  readonly onAllow: (clientId: string, allowed: boolean) => void;
  readonly settings: InboxMessageSettings;
}) => {
  const t = useTranslations("InboxMessages.settings");
  const [clientId, setClientId] = useState("");
  const id = useId();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAllow(clientId.trim(), true);
    setClientId("");
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium">{t("applications")}</h3>
      <p className="text-muted-foreground text-sm">
        {t("applicationsDescription")}
      </p>
      {settings.applications.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noApplications")}</p>
      ) : (
        <ul className="bg-card divide-y overflow-hidden rounded-md border">
          {settings.applications.map((application) => (
            <li
              key={application.clientId}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <code className="text-sm">{application.clientId}</code>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  onAllow(application.clientId, false);
                }}
              >
                {t("revoke")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <span className="flex flex-col gap-1">
          <Label htmlFor={id}>{t("clientId")}</Label>
          <Input
            id={id}
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
            }}
          />
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={disabled || clientId.trim() === ""}
          focusableWhenDisabled
        >
          {t("allow")}
        </Button>
      </form>
    </div>
  );
};

/**
 * What the workspace decided about its direct messages, for a member who
 * connects channels: which channels' messages Peal reads, each switched
 * in person; and, for an owner, which applications may read them.
 */
export const MessageSettingsPanel = ({
  mayAllowApplications,
  workspaceId,
}: {
  readonly mayAllowApplications: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("InboxMessages.settings");
  const hydrated = useHydrated();
  const settings = useAtomValue(messageSettings(workspaceId));
  const channels = useAtomValue(channelsOf(workspaceId));
  const switchOne = useAtomSet(setChannelMessages, { mode: "promiseExit" });
  const allowOne = useAtomSet(setMessageApplication, { mode: "promiseExit" });
  const [pending, start] = useTransition();
  const titleId = useId();

  if (
    !hydrated ||
    !AsyncResult.isSuccess(settings) ||
    !AsyncResult.isSuccess(channels)
  ) {
    return null;
  }

  const reactivityKeys = messageSettingsChanged(workspaceId);

  const eligible = channels.value.filter(({ platform }) =>
    messagePlatforms.has(platform)
  );

  const on = new Set(settings.value.channels.map(({ channelId }) => channelId));

  const done = <A, E>(exit: Exit.Exit<A, E>) => {
    if (Exit.isFailure(exit)) {
      toast.error(t("failed"));
    }
  };

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      {eligible.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      ) : (
        <ul className="bg-card divide-y overflow-hidden rounded-md border">
          {eligible.map((channel) => (
            <ChannelMessagesView
              key={channel.id}
              channel={channel}
              disabled={pending}
              on={on.has(channel.id)}
              onSwitch={(enabled) => {
                start(async () => {
                  done(
                    await switchOne({
                      params: { channelId: channel.id, workspaceId },
                      payload: { enabled },
                      reactivityKeys,
                    })
                  );
                });
              }}
            />
          ))}
        </ul>
      )}
      {mayAllowApplications ? (
        <Applications
          disabled={pending}
          settings={settings.value}
          onAllow={(clientId, allowed) => {
            start(async () => {
              done(
                await allowOne({
                  params: { workspaceId },
                  payload: { allowed, clientId },
                  reactivityKeys,
                })
              );
            });
          }}
        />
      ) : null}
    </section>
  );
};
