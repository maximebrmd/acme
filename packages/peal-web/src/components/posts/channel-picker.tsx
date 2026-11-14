"use client";

import { useTranslations } from "next-intl";
import type { SocialChannel } from "peal-contract";
import { Avatar, AvatarFallback, AvatarImage } from "peal-ui/components/avatar";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";

import { channelInitial, channelTitle } from "#channels/channel-name.ts";
import { everyChannel, offersEveryChannel } from "#posts/channel-selection.ts";

interface ChannelPickerProps {
  readonly channels: readonly SocialChannel[];
  readonly disabled: boolean;
  readonly onChange: (channelIds: readonly string[]) => void;
  readonly selected: readonly string[];
}

// The workspace's channels, to pick where the post goes. The order of the
// list is kept, whatever order they are picked in. From three channels up,
// "Select all" picks every channel that publishes, and "Clear" none.
export const ChannelPicker = ({
  channels,
  disabled,
  onChange,
  selected,
}: ChannelPickerProps) => {
  const t = useTranslations("Posts");

  const toggle = (channelId: string, checked: boolean) => {
    onChange(
      channels
        .map(({ id }) => id)
        .filter((id) => (id === channelId ? checked : selected.includes(id)))
    );
  };

  if (channels.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("Composer.channelsEmpty")}
      </p>
    );
  }

  const all = everyChannel(channels, selected);

  const list = (
    <ul className="grid gap-2 sm:grid-cols-2">
      {channels.map((channel) => {
        const id = `channel-${channel.id}`;

        return (
          <li
            key={channel.id}
            className="flex items-center gap-3 rounded-lg border p-2"
          >
            <Checkbox
              id={id}
              aria-describedby={`${id}-detail`}
              checked={selected.includes(channel.id)}
              disabled={disabled}
              onCheckedChange={(checked) => {
                toggle(channel.id, checked === true);
              }}
            />
            <Avatar size="sm">
              {channel.avatarUrl === null ? null : (
                <AvatarImage src={channel.avatarUrl} alt="" />
              )}
              <AvatarFallback>{channelInitial(channel)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <Label htmlFor={id}>{channelTitle(channel)}</Label>
              <span
                id={`${id}-detail`}
                className="text-muted-foreground truncate text-xs"
              >
                {t("Composer.channelDetail", {
                  handle: channel.handle,
                  platform: t("platform", { platform: channel.platform }),
                })}
              </span>
            </div>
            {channel.status._tag === "active" ? null : (
              <Badge variant="outline">
                {channel.status._tag === "disabled"
                  ? t("Composer.channelDisabled")
                  : t("Composer.channelNeedsReconnect")}
              </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (!offersEveryChannel(channels)) {
    return list;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={
            disabled || all.every((channelId) => selected.includes(channelId))
          }
          focusableWhenDisabled
          onClick={() => {
            onChange(all);
          }}
        >
          {t("Composer.selectAllChannels")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || selected.length === 0}
          focusableWhenDisabled
          onClick={() => {
            onChange([]);
          }}
        >
          {t("Composer.clearChannels")}
        </Button>
      </div>
      {list}
    </div>
  );
};
