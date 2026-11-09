"use client";

import type { Channel } from "acme-contract";
import { Avatar, AvatarFallback, AvatarImage } from "acme-ui/components/avatar";
import { Badge } from "acme-ui/components/badge";
import { Checkbox } from "acme-ui/components/checkbox";
import { Label } from "acme-ui/components/label";
import { useTranslations } from "next-intl";

interface ChannelPickerProps {
  readonly channels: readonly Channel[];
  readonly disabled: boolean;
  readonly onChange: (channelIds: readonly string[]) => void;
  readonly selected: readonly string[];
}

const initialOf = (channel: Channel) =>
  (channel.displayName ?? channel.handle).replace(/^@/u, "").slice(0, 1);

// The workspace's channels, to pick where the post goes. The order of the
// list is kept, whatever order they are picked in.
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

  return (
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
                toggle(channel.id, checked);
              }}
            />
            <Avatar size="sm">
              {channel.avatarUrl === null ? null : (
                <AvatarImage src={channel.avatarUrl} alt="" />
              )}
              <AvatarFallback>{initialOf(channel)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <Label htmlFor={id}>
                {channel.displayName ?? channel.handle}
              </Label>
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
};
