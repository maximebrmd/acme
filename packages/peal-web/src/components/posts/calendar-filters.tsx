"use client";

import { useTranslations } from "next-intl";
import type { Channel, Tag } from "peal-contract";
import { Button } from "peal-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "peal-ui/components/dropdown-menu";
import { TagDot } from "peal-ui/components/tag";

import { isFiltering, noFilter, withChoice } from "#posts/calendar-filter.ts";
import type { CalendarFilter } from "#posts/calendar-filter.ts";

/**
 * The calendar's filters: the workspace's tags and channels, several of
 * each to choose, how many posts the choice hides, and a way to clear it.
 * A kind with nothing to choose from is left out.
 */
export const CalendarFilters = ({
  channels,
  filter,
  hidden,
  onChange,
  tags,
}: {
  readonly channels: readonly Channel[];
  readonly filter: CalendarFilter;
  /** How many of the posts on screen the filter hides. */
  readonly hidden: number;
  readonly onChange: (filter: CalendarFilter) => void;
  readonly tags: readonly Tag[];
}) => {
  const t = useTranslations("Posts.Calendar");
  const tPosts = useTranslations("Posts");

  if (tags.length === 0 && channels.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.length === 0 ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            {t("filterTags", { count: filter.tagIds.length })}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("filterTagsLabel")}</DropdownMenuLabel>
              {tags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={filter.tagIds.includes(tag.id)}
                  closeOnClick={false}
                  onCheckedChange={(checked) => {
                    onChange({
                      ...filter,
                      tagIds: withChoice(filter.tagIds, tag.id, checked),
                    });
                  }}
                >
                  <TagDot colour={tag.colour} />
                  <span className="truncate">{tag.name}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {channels.length === 0 ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            {t("filterChannels", { count: filter.channelIds.length })}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("filterChannelsLabel")}</DropdownMenuLabel>
              {channels.map((channel) => (
                <DropdownMenuCheckboxItem
                  key={channel.id}
                  checked={filter.channelIds.includes(channel.id)}
                  closeOnClick={false}
                  onCheckedChange={(checked) => {
                    onChange({
                      ...filter,
                      channelIds: withChoice(
                        filter.channelIds,
                        channel.id,
                        checked
                      ),
                    });
                  }}
                >
                  <span className="truncate">
                    {tPosts("Composer.channelDetail", {
                      handle: channel.handle,
                      platform: tPosts("platform", {
                        platform: channel.platform,
                      }),
                    })}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {isFiltering(filter) ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(noFilter);
          }}
        >
          {t("clearFilters")}
        </Button>
      ) : null}
      <output className="text-muted-foreground text-sm">
        {isFiltering(filter) ? t("hiddenByFilters", { count: hidden }) : null}
      </output>
    </div>
  );
};
