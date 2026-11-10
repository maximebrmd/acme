"use client";

import { useTranslations } from "next-intl";
import { maxChannelSetNameLength, maxChannelsPerSet } from "peal-contract";
import type { Channel, ChannelSet } from "peal-contract";
import { Checkbox } from "peal-ui/components/checkbox";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import type { ReactNode } from "react";

import {
  connectedChannels,
  missingChannels,
  withChannel,
} from "#channel-sets/selection.ts";
import { SavedItemErrorAlert } from "#components/settings/saved-item-error.tsx";
import type { SavedItemError } from "#settings/saved-item-error.ts";

// The views of a workspace's channel sets: what a set and its form look
// like, whatever fetched them. The settings page's state lives in
// channel-sets-settings.tsx.

/** A channel set as its form holds it. */
export interface ChannelSetDraft {
  readonly channelIds: readonly string[];
  readonly name: string;
}

/**
 * A channel set's form: its name, and the workspace's connected channels,
 * a box each. `dropped` says how many channels of the set being changed
 * are no longer connected: saving leaves them out.
 */
export const ChannelSetFieldsView = ({
  channels,
  disabled,
  draft,
  dropped,
  error,
  idPrefix,
  onChange,
}: {
  /** The workspace's connected channels. */
  readonly channels: readonly Channel[];
  readonly disabled: boolean;
  readonly draft: ChannelSetDraft;
  readonly dropped: number;
  readonly error: SavedItemError | null;
  /** Tells this form's fields from another's on the page. */
  readonly idPrefix: string;
  readonly onChange: (draft: ChannelSetDraft) => void;
}) => {
  const t = useTranslations("ChannelSets");
  const tPosts = useTranslations("Posts");
  const nameId = `${idPrefix}-set-name`;

  return (
    <div className="flex flex-col gap-4">
      <SavedItemErrorAlert error={error} kind="channelSet" />
      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor={nameId}>{t("name")}</Label>
        <Input
          id={nameId}
          value={draft.name}
          maxLength={maxChannelSetNameLength}
          disabled={disabled}
          required
          onChange={(event) => {
            onChange({ ...draft, name: event.target.value });
          }}
        />
      </div>
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-2 text-sm font-medium">{t("channels")}</legend>
        {channels.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noChannels")}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {channels.map((channel) => {
              const id = `${idPrefix}-set-channel-${channel.id}`;

              return (
                <li key={channel.id} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={draft.channelIds.includes(channel.id)}
                    disabled={disabled}
                    onCheckedChange={(checked) => {
                      onChange({
                        ...draft,
                        channelIds: withChannel(
                          draft.channelIds,
                          channels,
                          channel.id,
                          checked
                        ),
                      });
                    }}
                  />
                  <Label htmlFor={id}>
                    {tPosts("Composer.channelDetail", {
                      handle: channel.handle,
                      platform: tPosts("platform", {
                        platform: channel.platform,
                      }),
                    })}
                  </Label>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-muted-foreground text-xs">
          {t("channelsHint", { max: maxChannelsPerSet })}
        </p>
        {dropped === 0 ? null : (
          <p className="text-sm">{t("editDrops", { count: dropped })}</p>
        )}
      </fieldset>
    </div>
  );
};

/**
 * One of the workspace's channel sets: its name, its connected channels
 * with platform and handle, a warning naming how many are no longer
 * connected, what a member may do to it (`actions`) and what they opened
 * under it (`children`).
 */
export const ChannelSetItemView = ({
  actions,
  channels,
  children,
  nameId,
  set,
}: {
  readonly actions?: ReactNode;
  /** The workspace's connected channels. */
  readonly channels: readonly Channel[];
  readonly children?: ReactNode;
  /** The id of the set's name, which names its actions. */
  readonly nameId?: string;
  readonly set: ChannelSet;
}) => {
  const t = useTranslations("ChannelSets");
  const tPosts = useTranslations("Posts");
  const connected = connectedChannels(set, channels);
  const missing = missingChannels(set, channels).length;

  return (
    <li className="flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-2">
          <span id={nameId} className="font-medium">
            {set.name}
          </span>
          {connected.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noneLeft")}</p>
          ) : (
            <ul
              aria-label={t("channelsOf", { name: set.name })}
              className="text-muted-foreground flex flex-col gap-1 text-sm"
            >
              {connected.map((channel) => (
                <li key={channel.id}>
                  {tPosts("Composer.channelDetail", {
                    handle: channel.handle,
                    platform: tPosts("platform", {
                      platform: channel.platform,
                    }),
                  })}
                </li>
              ))}
            </ul>
          )}
          {missing === 0 ? null : (
            <p className="text-sm">{t("missing", { count: missing })}</p>
          )}
        </div>
        {actions === undefined ? null : (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}
      </div>
      {children}
    </li>
  );
};
