"use client";

import { DateTime } from "effect";
import { XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  maxChannelsPerQueue,
  maxQueueNameLength,
  maxSlotsPerQueue,
  queueHorizonDays,
  weekdays,
} from "peal-contract";
import type {
  SocialChannel,
  ChannelSet,
  Queue,
  QueuePreview,
  QueueSlot,
  Weekday,
} from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useState } from "react";
import type { ReactNode } from "react";

import { withChannel } from "#channel-sets/selection.ts";
import { channelName } from "#channels/channel-name.ts";
import { SavedItemErrorAlert } from "#components/settings/saved-item-error.tsx";
import { useTimeOptions } from "#i18n/hour-cycle.ts";
import { slotsInWeek, withoutSlot, withSlot } from "#queues/slots.ts";
import type { QueueDraft } from "#queues/slots.ts";
import type { SavedItemError } from "#settings/saved-item-error.ts";

// The views of a workspace's queues: what a queue, its form and its
// coming slots look like, whatever fetched them. The settings page's
// state lives in queues-settings.tsx.

const zoneLabel = (zone: string) => zone.replaceAll("_", " ");

// The slots of a week, as one line.
const weekLine = (slots: readonly string[]): string => slots.join(" · ");

// The channel set picker's value for none.
const noSet = "none";

/** A slot's day and time, in the reader's words and hour format. */
export const useSlotText = () => {
  const t = useTranslations("Queues");
  const format = useFormatter();
  const timeOptions = useTimeOptions();

  return ({ day, time }: QueueSlot): string => {
    const [hour = 0, minute = 0] = time.split(":").map(Number);

    return t("slot", {
      day: t("day", { day }),
      time: format.dateTime(Date.UTC(2026, 0, 5, hour, minute), {
        timeStyle: "short",
        timeZone: "UTC",
        ...timeOptions,
      }),
    });
  };
};

// The slot a member is about to add: a day, and a time of day.
const NewSlot = ({
  disabled,
  idPrefix,
  onAdd,
}: {
  readonly disabled: boolean;
  readonly idPrefix: string;
  readonly onAdd: (slot: QueueSlot) => void;
}) => {
  const t = useTranslations("Queues");
  const [day, setDay] = useState<Weekday>("monday");
  const [time, setTime] = useState("09:00");
  const dayId = `${idPrefix}-slot-day`;
  const timeId = `${idPrefix}-slot-time`;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-2">
        <Label id={dayId}>{t("slotDay")}</Label>
        <Select
          value={day}
          disabled={disabled}
          onValueChange={(picked) => {
            if (picked !== null) {
              setDay(picked);
            }
          }}
        >
          <SelectTrigger aria-labelledby={dayId}>
            <SelectValue>{t("day", { day })}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {weekdays.map((one) => (
              <SelectItem key={one} value={one}>
                {t("day", { day: one })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={timeId}>{t("slotTime")}</Label>
        <Input
          id={timeId}
          type="time"
          value={time}
          disabled={disabled}
          onChange={(event) => {
            setTime(event.target.value);
          }}
        />
      </div>
      <Button
        variant="outline"
        disabled={disabled || !/^\d{2}:\d{2}$/u.test(time)}
        focusableWhenDisabled
        onClick={() => {
          onAdd({ day, time: time.slice(0, 5) });
        }}
      >
        {t("addSlot")}
      </Button>
    </div>
  );
};

/**
 * A queue's form: its name, its zone, its week of slots, the workspace's
 * connected channels and channel sets, and whether it is the default.
 * `dropped` says how many channels of the queue being changed are no
 * longer connected: saving leaves them out.
 */
export const QueueFieldsView = ({
  channelSets,
  channels,
  disabled,
  draft,
  dropped,
  error,
  idPrefix,
  onChange,
  zones,
}: {
  readonly channelSets: readonly ChannelSet[];
  /** The workspace's connected channels. */
  readonly channels: readonly SocialChannel[];
  readonly disabled: boolean;
  readonly draft: QueueDraft;
  readonly dropped: number;
  readonly error: SavedItemError | null;
  /** Tells this form's fields from another's on the page. */
  readonly idPrefix: string;
  readonly onChange: (draft: QueueDraft) => void;
  /** The time zones to choose from, the queue's included. */
  readonly zones: readonly string[];
}) => {
  const t = useTranslations("Queues");
  const tPosts = useTranslations("Posts");
  const slotText = useSlotText();
  const nameId = `${idPrefix}-queue-name`;
  const zoneId = `${idPrefix}-queue-zone`;
  const setId = `${idPrefix}-queue-set`;
  const defaultId = `${idPrefix}-queue-default`;
  const chosenSet = channelSets.find(({ id }) => id === draft.channelSetId);

  return (
    <div className="flex flex-col gap-4">
      <SavedItemErrorAlert error={error} kind="queue" />
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={nameId}>{t("name")}</Label>
          <Input
            id={nameId}
            value={draft.name}
            maxLength={maxQueueNameLength}
            disabled={disabled}
            required
            onChange={(event) => {
              onChange({ ...draft, name: event.target.value });
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label id={zoneId}>{t("timeZone")}</Label>
          <Select
            value={draft.timeZone}
            disabled={disabled}
            onValueChange={(zone) => {
              if (zone !== null) {
                onChange({ ...draft, timeZone: zone });
              }
            }}
          >
            <SelectTrigger aria-labelledby={zoneId}>
              <SelectValue>{zoneLabel(draft.timeZone)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zoneLabel(zone)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <fieldset className="flex flex-col gap-3" disabled={disabled}>
        <legend className="mb-2 text-sm font-medium">{t("slots")}</legend>
        {draft.slots.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noSlot")}</p>
        ) : (
          <ul aria-label={t("slots")} className="flex flex-wrap gap-2">
            {slotsInWeek(draft.slots).map((slot) => (
              <li key={`${slot.day}@${slot.time}`}>
                <Badge variant="secondary">
                  {slotText(slot)}
                  <button
                    type="button"
                    className="focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-3"
                    disabled={disabled}
                    onClick={() => {
                      onChange({
                        ...draft,
                        slots: withoutSlot(draft.slots, slot),
                      });
                    }}
                  >
                    <XIcon className="size-3" aria-hidden />
                    <span className="sr-only">
                      {t("removeSlot", { slot: slotText(slot) })}
                    </span>
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <NewSlot
          disabled={disabled || draft.slots.length >= maxSlotsPerQueue}
          idPrefix={idPrefix}
          onAdd={(slot) => {
            onChange({ ...draft, slots: withSlot(draft.slots, slot) });
          }}
        />
        <p className="text-muted-foreground text-xs">
          {t("slotsHint", {
            max: maxSlotsPerQueue,
            zone: zoneLabel(draft.timeZone),
          })}
        </p>
      </fieldset>
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-2 text-sm font-medium">{t("channels")}</legend>
        {channels.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noChannels")}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {channels.map((channel) => {
              const id = `${idPrefix}-queue-channel-${channel.id}`;

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
                          checked === true
                        ),
                      });
                    }}
                  />
                  <Label htmlFor={id}>
                    {tPosts("Composer.channelDetail", {
                      handle: channelName(channel),
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
          {t("channelsHint", { max: maxChannelsPerQueue })}
        </p>
        {dropped === 0 ? null : (
          <p className="text-sm">{t("editDrops", { count: dropped })}</p>
        )}
      </fieldset>
      {channelSets.length === 0 ? null : (
        <div className="flex max-w-sm flex-col gap-2">
          <Label id={setId}>{t("channelSet")}</Label>
          <Select
            value={draft.channelSetId === "" ? noSet : draft.channelSetId}
            disabled={disabled}
            onValueChange={(picked) => {
              onChange({
                ...draft,
                channelSetId: picked === null || picked === noSet ? "" : picked,
              });
            }}
          >
            <SelectTrigger aria-labelledby={setId}>
              <SelectValue>{chosenSet?.name ?? t("noChannelSet")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={noSet}>{t("noChannelSet")}</SelectItem>
              {channelSets.map((set) => (
                <SelectItem key={set.id} value={set.id}>
                  {set.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Checkbox
          id={defaultId}
          checked={draft.isDefault}
          disabled={disabled}
          onCheckedChange={(checked) => {
            onChange({ ...draft, isDefault: checked === true });
          }}
        />
        <Label htmlFor={defaultId}>{t("isDefault")}</Label>
      </div>
    </div>
  );
};

/** What a queue's coming slots are, as far as they were read. */
export type UpcomingSlots =
  | { readonly _tag: "failed" }
  | { readonly _tag: "loaded"; readonly preview: QueuePreview }
  | { readonly _tag: "loading" };

/**
 * A queue's next slots, on its own clock and in the reader's hour format,
 * each free or taken, and where a post added now goes.
 */
export const UpcomingSlotsView = ({
  timeZone,
  upcoming,
}: {
  readonly timeZone: string;
  readonly upcoming: UpcomingSlots;
}) => {
  const t = useTranslations("Queues");
  const format = useFormatter();
  const timeOptions = useTimeOptions();

  if (upcoming._tag === "loading") {
    return (
      <p className="text-muted-foreground text-sm">{t("upcomingLoading")}</p>
    );
  }

  if (upcoming._tag === "failed") {
    return <p className="text-sm">{t("upcomingFailed")}</p>;
  }

  const at = (instant: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(instant), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
      ...timeOptions,
    });

  const { nextFree, noRoom, slots } = upcoming.preview;

  return (
    <div className="flex flex-col gap-1 text-sm">
      {slots.length === 0 ? null : (
        <>
          <span className="text-muted-foreground">
            {t("upcoming", { zone: zoneLabel(timeZone) })}
          </span>
          <ul className="flex flex-col gap-1">
            {slots.map((slot) => (
              <li key={DateTime.formatIso(slot.at)}>
                {t("upcomingSlot", {
                  at: at(slot.at),
                  taken: slot.postId === null ? "free" : "taken",
                })}
              </li>
            ))}
          </ul>
        </>
      )}
      <p>
        {nextFree === null
          ? t("noRoom", { days: queueHorizonDays, reason: noRoom ?? "full" })
          : t("nextFree", { at: at(nextFree) })}
      </p>
    </div>
  );
};

/**
 * One of the workspace's queues: its name, whether it is the default, its
 * zone and week, its connected channels, a warning naming how many are no
 * longer connected, its coming slots (`upcoming`), what a member may do to
 * it (`actions`) and what they opened under it (`children`).
 */
export const QueueItemView = ({
  actions,
  channels,
  children,
  nameId,
  queue,
  upcoming,
}: {
  readonly actions?: ReactNode;
  /** The workspace's connected channels. */
  readonly channels: readonly SocialChannel[];
  readonly children?: ReactNode;
  /** The id of the queue's name, which names its actions. */
  readonly nameId?: string;
  readonly queue: Queue;
  readonly upcoming: ReactNode;
}) => {
  const t = useTranslations("Queues");
  const tPosts = useTranslations("Posts");
  const slotText = useSlotText();

  const connected = channels.filter(({ id }) => queue.channelIds.includes(id));
  const missing = queue.unavailableChannelIds.length;

  return (
    <li className="flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span id={nameId} className="font-medium">
              {queue.name}
            </span>
            {queue.isDefault ? (
              <Badge variant="outline">{t("defaultBadge")}</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {queue.slots.length === 0
              ? t("noSlot")
              : t("week", {
                  slots: weekLine(slotsInWeek(queue.slots).map(slotText)),
                  zone: zoneLabel(queue.timeZone),
                })}
          </p>
          {connected.length === 0 ? null : (
            <ul
              aria-label={t("channelsOf", { name: queue.name })}
              className="text-muted-foreground flex flex-col gap-1 text-sm"
            >
              {connected.map((channel) => (
                <li key={channel.id}>
                  {tPosts("Composer.channelDetail", {
                    handle: channelName(channel),
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
          {upcoming}
        </div>
        {actions === undefined ? null : (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}
      </div>
      {children}
    </li>
  );
};
