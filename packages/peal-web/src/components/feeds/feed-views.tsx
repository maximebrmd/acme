"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import { maxFeedTemplateLength } from "peal-contract";
import type {
  Channel,
  Feed,
  FeedItem,
  FeedMode,
  FeedPreview,
  Queue,
} from "peal-contract";
import { Badge } from "peal-ui/components/badge";
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
import { Textarea } from "peal-ui/components/textarea";
import { useId } from "react";
import type { ReactNode } from "react";

import { channelName } from "#channels/channel-name.ts";

/** What the form holds while a member writes a feed. */
export interface FeedDraft {
  /** Whether each item's picture goes with its post. */
  readonly attachPicture: boolean;
  readonly channelIds: readonly string[];
  readonly mode: FeedMode;
  /** The queue's id; empty for the workspace's default. */
  readonly queueId: string;
  readonly template: string;
  readonly url: string;
}

const defaultQueue = "default";

/** A feed as a list shows it, with its actions. */
export const FeedItemView = ({
  actions,
  feed,
  highlighted = false,
  items,
}: {
  readonly actions: ReactNode;
  readonly feed: Feed;
  /** Whether the page was opened for this feed, from a notice. */
  readonly highlighted?: boolean;
  /** Its items, when shown. */
  readonly items: ReactNode;
}) => {
  const t = useTranslations("Feeds");
  const format = useFormatter();
  const titleId = useId();

  return (
    <li
      aria-labelledby={titleId}
      aria-current={highlighted ? "true" : undefined}
      className="aria-[current=true]:bg-muted/50 flex flex-col gap-3 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span id={titleId} className="font-medium break-all">
              {feed.title ?? feed.url}
            </span>
            <Badge variant={feed.status === "active" ? "secondary" : "outline"}>
              {t("status", { status: feed.status })}
            </Badge>
            <Badge variant="outline">{t("mode", { mode: feed.mode })}</Badge>
          </div>
          <p className="text-muted-foreground text-sm break-all">{feed.url}</p>
          {feed.status === "stopped" ? (
            <p className="text-sm">
              {t("stoppedBecause", {
                reason: feed.stopReason ?? "unreachable",
              })}
            </p>
          ) : null}
          {feed.lastFailure === null || feed.status !== "active" ? null : (
            <p className="text-sm">
              {t("failing", { failure: feed.lastFailure })}
            </p>
          )}
          {feed.status === "active" ? (
            <p className="text-muted-foreground text-sm">
              {t("nextRead", {
                at: format.dateTime(DateTime.toDate(feed.nextCheckAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </p>
          ) : null}
        </div>
        {actions === null ? null : (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}
      </div>
      {items}
    </li>
  );
};

/** A feed's newest items: what became of each, never what it said. */
export const FeedItemsView = ({
  items,
}: {
  readonly items: readonly FeedItem[];
}) => {
  const t = useTranslations("Feeds");
  const format = useFormatter();

  return items.length === 0 ? (
    <p className="text-muted-foreground text-sm">{t("noItems")}</p>
  ) : (
    <ul aria-label={t("items")} className="flex flex-col gap-1 text-sm">
      {items.map((item) => (
        <li key={item.digest} className="text-muted-foreground">
          {t("item", {
            at: format.dateTime(DateTime.toDate(item.seenAt), {
              dateStyle: "medium",
              timeStyle: "short",
            }),
            outcome: item.outcome,
            reason: item.reason ?? "none",
          })}
          {item.pictureSkipped === null
            ? null
            : ` ${t("pictureSkipped", { reason: item.pictureSkipped })}`}
        </li>
      ))}
    </ul>
  );
};

/** What a preview read: each newest item as its post would say it. */
export const FeedPreviewView = ({
  preview,
}: {
  readonly preview: FeedPreview;
}) => {
  const t = useTranslations("Feeds");

  return (
    <section className="flex flex-col gap-2" aria-label={t("previewTitle")}>
      <p className="text-sm font-medium">
        {t("previewOf", { title: preview.title ?? "" })}
      </p>
      <p className="text-muted-foreground text-xs">{t("othersText")}</p>
      {preview.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noItems")}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {preview.items.map((item, place) => (
            <li
              key={item.link ?? `${String(place)}-${item.title ?? ""}`}
              dir="auto"
              className="bg-muted/40 rounded-md p-3 text-sm whitespace-pre-wrap"
            >
              {item.text ?? t("nothingToPost")}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

/** The fields of a feed: its address, template, mode, queue, channels. */
export const FeedFieldsView = ({
  channels,
  disabled,
  draft,
  mayQueue,
  onChange,
  queues,
}: {
  readonly channels: readonly Channel[];
  readonly disabled: boolean;
  readonly draft: FeedDraft;
  /** Whether the member may schedule, as a queue needs. */
  readonly mayQueue: boolean;
  readonly onChange: (draft: FeedDraft) => void;
  readonly queues: readonly Queue[];
}) => {
  const t = useTranslations("Feeds");
  const tPosts = useTranslations("Posts");
  const prefix = useId();
  const urlId = `${prefix}-url`;
  const templateId = `${prefix}-template`;
  const modeId = `${prefix}-mode`;
  const queueId = `${prefix}-queue`;
  const pictureId = `${prefix}-picture`;
  const chosenQueue = queues.find(({ id }) => id === draft.queueId);

  return (
    <>
      <div className="flex max-w-xl flex-col gap-2">
        <Label htmlFor={urlId}>{t("url")}</Label>
        <Input
          id={urlId}
          type="url"
          inputMode="url"
          required
          placeholder="https://"
          value={draft.url}
          disabled={disabled}
          onChange={(event) => {
            onChange({ ...draft, url: event.target.value });
          }}
        />
        <p className="text-muted-foreground text-xs">{t("urlHint")}</p>
      </div>
      <div className="flex max-w-xl flex-col gap-2">
        <Label htmlFor={templateId}>{t("template")}</Label>
        <Textarea
          id={templateId}
          rows={3}
          maxLength={maxFeedTemplateLength}
          value={draft.template}
          disabled={disabled}
          onChange={(event) => {
            onChange({ ...draft, template: event.target.value });
          }}
        />
        <p className="text-muted-foreground text-xs">{t("templateHint")}</p>
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <Label id={modeId}>{t("modeLabel")}</Label>
        <Select
          value={draft.mode}
          disabled={disabled || !mayQueue}
          onValueChange={(picked) => {
            if (picked === "draft" || picked === "queue") {
              onChange({ ...draft, mode: picked });
            }
          }}
        >
          <SelectTrigger aria-labelledby={modeId}>
            <SelectValue>{t("mode", { mode: draft.mode })}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">
              {t("mode", { mode: "draft" })}
            </SelectItem>
            <SelectItem value="queue">
              {t("mode", { mode: "queue" })}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {mayQueue ? t("modeHint") : t("modeDraftsOnly")}
        </p>
      </div>
      {draft.mode === "queue" ? (
        <div className="flex max-w-sm flex-col gap-2">
          <Label id={queueId}>{t("queue")}</Label>
          <Select
            value={draft.queueId === "" ? defaultQueue : draft.queueId}
            disabled={disabled}
            onValueChange={(picked) => {
              onChange({
                ...draft,
                queueId:
                  picked === null || picked === defaultQueue ? "" : picked,
              });
            }}
          >
            <SelectTrigger aria-labelledby={queueId}>
              <SelectValue>
                {chosenQueue?.name ?? t("defaultQueue")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={defaultQueue}>{t("defaultQueue")}</SelectItem>
              {queues.map((queue) => (
                <SelectItem key={queue.id} value={queue.id}>
                  {queue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="flex max-w-xl flex-col gap-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id={pictureId}
            checked={draft.attachPicture}
            disabled={disabled}
            onCheckedChange={(checked) => {
              onChange({ ...draft, attachPicture: checked === true });
            }}
          />
          <Label htmlFor={pictureId}>{t("picture")}</Label>
        </div>
        <p className="text-muted-foreground text-xs">{t("pictureHint")}</p>
      </div>
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-2 text-sm font-medium">{t("channels")}</legend>
        {channels.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noChannels")}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {channels.map((channel) => {
              const id = `${prefix}-channel-${channel.id}`;

              return (
                <li key={channel.id} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={draft.channelIds.includes(channel.id)}
                    disabled={disabled}
                    onCheckedChange={(checked) => {
                      onChange({
                        ...draft,
                        channelIds:
                          checked === true
                            ? [...draft.channelIds, channel.id]
                            : draft.channelIds.filter(
                                (kept) => kept !== channel.id
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
        <p className="text-muted-foreground text-xs">{t("channelsHint")}</p>
      </fieldset>
    </>
  );
};
