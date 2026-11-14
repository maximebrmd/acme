"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { isSocialChannel } from "peal-contract";
import type { InboxMessageSettings, SocialChannel } from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { channelsOf, reconnectChannel } from "#channels/channels-api.ts";
import { rememberConnection } from "#channels/pending-connection.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { inboxErrorOf } from "#inbox/errors.ts";
import {
  messageSettings,
  messageSettingsChanged,
  setChannelMessages,
  setMessageApplication,
} from "#inbox/message-atoms.ts";

import { useChannelName } from "./inbox-views.tsx";

// The platforms whose direct messages Peal may read.
const messagePlatforms: ReadonlySet<string> = new Set(["mastodon", "bluesky"]);

// Whether the switch was refused until the account allows its messages.
const needsGrant = <A, E extends { readonly _tag: string }>(
  exit: Exit.Exit<A, E>
) =>
  inboxErrorOf(exit).pipe(
    Option.exists(
      (explained) =>
        explained.key === "unavailable" && explained.standing === "reconnect"
    )
  );

/**
 * One channel's switch: its messages read, or not. `onGrant`, for an
 * account that must allow its messages first (Bluesky's chat), starts the
 * sign-in that asks for them.
 */
export const ChannelMessagesView = ({
  channel,
  disabled,
  on,
  onGrant,
  onSwitch,
}: {
  readonly channel: SocialChannel;
  readonly disabled: boolean;
  readonly on: boolean;
  readonly onGrant?: () => void;
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
      {onGrant === undefined ? (
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
      ) : (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {t("grantNeeded")}
          </span>
          <Button size="sm" disabled={disabled} onClick={onGrant}>
            {t("grant")}
          </Button>
        </span>
      )}
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
  const reconnect = useAtomSet(reconnectChannel, { mode: "promiseExit" });
  // The channels whose accounts must allow their messages first.
  const [ungranted, setUngranted] = useState<ReadonlySet<string>>(new Set());
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

  const eligible = channels.value
    .filter(isSocialChannel)
    .filter(({ platform }) => messagePlatforms.has(platform));

  const on = new Set(settings.value.channels.map(({ channelId }) => channelId));

  const done = <A, E>(exit: Exit.Exit<A, E>) => {
    if (Exit.isFailure(exit)) {
      toast.error(t("failed"));
    }
  };

  const grant = (channel: SocialChannel) => {
    start(async () => {
      const exit = await reconnect({
        params: { channelId: channel.id, workspaceId },
        query: { messages: "true" },
      });

      if (Exit.isSuccess(exit)) {
        rememberConnection({ platform: channel.platform, workspaceId });
        globalThis.location.assign(exit.value.authorizationUrl);

        return;
      }

      toast.error(t("failed"));
    });
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
              {...(ungranted.has(channel.id)
                ? {
                    onGrant: () => {
                      grant(channel);
                    },
                  }
                : {})}
              onSwitch={(enabled) => {
                start(async () => {
                  const exit = await switchOne({
                    params: { channelId: channel.id, workspaceId },
                    payload: { enabled },
                    reactivityKeys,
                  });

                  if (needsGrant(exit)) {
                    setUngranted((now) => new Set([...now, channel.id]));

                    return;
                  }

                  done(exit);
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
