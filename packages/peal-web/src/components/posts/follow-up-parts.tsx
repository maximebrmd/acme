"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  Channel,
  ChannelOptions,
  MediaAttachment,
  Permission,
} from "peal-contract";
import { maxFollowUps } from "peal-contract/post-text";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { MediaUploaderHandle } from "#components/media/media-uploader.tsx";
import { CharacterCounters } from "#components/posts/character-counters.tsx";
import { MediaAttachments } from "#components/posts/media-attachments.tsx";
import { PlainTextEditor } from "#components/posts/plain-text-editor.tsx";
import { useAttachedMedia } from "#posts/attached-media.ts";
import { fitOn } from "#posts/character-count.ts";
import { mediaFitOn, showsAltText } from "#posts/media-fit.ts";
import {
  addPart,
  delayChoices,
  movePart,
  partsTaken,
  partTextOn,
  removePart,
  roomForParts,
  updatePart,
  withPartOverride,
} from "#posts/parts.ts";
import type { PartDraft } from "#posts/parts.ts";

type SetParts = Dispatch<SetStateAction<readonly PartDraft[]>>;

interface PartEditorProps {
  readonly count: number;
  /** Nothing changes for now, as while the post is being saved. */
  readonly disabled: boolean;
  /** The post can still be written. */
  readonly editable: boolean;
  readonly onParts: SetParts;
  /** The options the post has on its channels, some counted with a text. */
  readonly options: readonly ChannelOptions[];
  readonly part: PartDraft;
  readonly permissions: readonly Permission[];
  /** Its place among the post's parts, the post itself being the first. */
  readonly position: number;
  readonly selected: readonly Channel[];
  readonly workspaceId: string;
}

// One part after the first: its text, how it fits each channel, its images
// and videos, and how long it waits after the part before it.
const PartEditor = ({
  count,
  disabled,
  editable,
  onParts,
  options,
  part,
  permissions,
  position,
  selected,
  workspaceId,
}: PartEditorProps) => {
  const t = useTranslations("Posts.Parts");
  const tComposer = useTranslations("Posts.Composer");
  const tPosts = useTranslations("Posts");
  const id = useId();
  const attached = useAttachedMedia(workspaceId, part.media);
  const named = { position };
  const locked = disabled || !editable;
  // Files pasted into the part's texts join the part's own media.
  const uploader = useRef<MediaUploaderHandle>(null);

  const pasteFiles = (files: readonly File[]) =>
    uploader.current?.add(files) ?? false;

  const change = (changes: Partial<Omit<PartDraft, "key">>) => {
    onParts((current) => updatePart(current, part.key, changes));
  };

  // The media section changes the list as it is now: here, the part's own,
  // read from the latest parts.
  const changeMedia = (
    update: (current: readonly MediaAttachment[]) => readonly MediaAttachment[]
  ) => {
    onParts((current) =>
      current.map((other) =>
        other.key === part.key
          ? { ...other, media: update(other.media) }
          : other
      )
    );
  };

  // The channels this part has a text of its own on: each is shown, so
  // nothing goes out that the member did not see.
  const own = selected.flatMap((channel) =>
    part.overrides
      .filter(({ channelId }) => channelId === channel.id)
      .map(({ text }) => ({ channel, text }))
  );

  const optionsOn = (channelId: string) =>
    options.find((chosen) => chosen.channelId === channelId)?.options;

  const fits = selected.map((channel) => ({
    channel,
    // Counted as it goes out there: the channel's own text when it has one.
    fit: fitOn(
      channel.platform,
      partTextOn(part, channel.id),
      part.media.length,
      optionsOn(channel.id)
    ),
    media: mediaFitOn(channel.platform, attached, optionsOn(channel.id)),
  }));

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-title`} className="text-sm font-medium">
          {t("partTitle", named)}
        </h3>
        {locked ? null : (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("moveEarlier", named)}
              disabled={position === 2}
              focusableWhenDisabled
              onClick={() => {
                onParts((current) => movePart(current, part.key, -1));
              }}
            >
              <ArrowUpIcon aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("moveLater", named)}
              disabled={position === count + 1}
              focusableWhenDisabled
              onClick={() => {
                onParts((current) => movePart(current, part.key, 1));
              }}
            >
              <ArrowDownIcon aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("remove", named)}
              onClick={() => {
                onParts((current) => removePart(current, part.key));
              }}
            >
              <Trash2Icon aria-hidden />
            </Button>
          </div>
        )}
      </div>
      <PlainTextEditor
        id={`${id}-text`}
        labelledBy={`${id}-title`}
        describedBy={`${id}-hint`}
        placeholder={t("textPlaceholder")}
        readOnly={locked}
        value={part.text}
        onChange={(text) => {
          change({ text });
        }}
        onPasteFiles={pasteFiles}
      />
      <p id={`${id}-hint`} className="sr-only">
        {t("textHint", named)}
      </p>
      {own.map(({ channel, text }) => {
        const where = {
          channel: tComposer("channelDetail", {
            handle: channel.handle,
            platform: tPosts("platform", { platform: channel.platform }),
          }),
          position,
        };

        return (
          <div key={channel.id} className="flex flex-col gap-2">
            <Label id={`${id}-own-${channel.id}`}>{t("ownText", where)}</Label>
            <PlainTextEditor
              id={`${id}-own-${channel.id}-text`}
              labelledBy={`${id}-own-${channel.id}`}
              describedBy={`${id}-own-${channel.id}-hint`}
              placeholder={t("textPlaceholder")}
              readOnly={locked}
              value={text}
              onChange={(changed) => {
                change({
                  overrides: withPartOverride(
                    part.overrides,
                    channel.id,
                    changed
                  ),
                });
              }}
              onPasteFiles={pasteFiles}
            />
            <p
              id={`${id}-own-${channel.id}-hint`}
              className="text-muted-foreground text-sm"
            >
              {t("ownTextHint", where)}
            </p>
            {locked ? null : (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    change({
                      overrides: withPartOverride(
                        part.overrides,
                        channel.id,
                        null
                      ),
                    });
                  }}
                >
                  {t("dropOwnText", where)}
                </Button>
              </div>
            )}
          </div>
        );
      })}
      <CharacterCounters fits={fits} />
      <div className="flex flex-col gap-2">
        <Label id={`${id}-delay`}>{t("delayLabel")}</Label>
        <Select
          value={String(part.delaySeconds)}
          disabled={locked}
          onValueChange={(seconds) => {
            if (seconds !== null) {
              change({ delaySeconds: Number(seconds) });
            }
          }}
        >
          <SelectTrigger aria-labelledby={`${id}-delay`}>
            <SelectValue>
              {t("delay", { seconds: part.delaySeconds })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {delayChoices(part.delaySeconds).map((seconds) => (
              <SelectItem key={seconds} value={String(seconds)}>
                {t("delay", { seconds })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">
          {t("mediaLegend", named)}
        </legend>
        <MediaAttachments
          attached={attached}
          canBrowse={permissions.includes("media:read")}
          canUpload={permissions.includes("media:upload")}
          disabled={disabled}
          editable={editable}
          platforms={selected.flatMap(({ id: channelId, platform }) =>
            showsAltText(platform, optionsOn(channelId)) ? [platform] : []
          )}
          uploader={uploader}
          workspaceId={workspaceId}
          onChange={changeMedia}
        />
      </fieldset>
    </li>
  );
};

interface FollowUpPartsProps {
  /** Nothing changes for now, as while the post is being saved. */
  readonly disabled: boolean;
  /** The post can still be written: a draft the member may change. */
  readonly editable: boolean;
  readonly onChange: SetParts;
  /** The options the post has on its channels. */
  readonly options: readonly ChannelOptions[];
  readonly parts: readonly PartDraft[];
  readonly permissions: readonly Permission[];
  /** The channels the post goes to. */
  readonly selected: readonly Channel[];
  readonly workspaceId: string;
}

/**
 * The parts that follow the post: a thread where the platform has threads,
 * each part a reply to the one before it. Parts are added at the end,
 * moved, and removed; each has its text, its counter on every channel, its
 * images and videos, and the wait before it. A channel whose platform takes
 * a post alone is named: scheduling would refuse the post there.
 */
export const FollowUpParts = ({
  disabled,
  editable,
  onChange,
  options,
  parts,
  permissions,
  selected,
  workspaceId,
}: FollowUpPartsProps) => {
  const t = useTranslations("Posts.Parts");
  const tComposer = useTranslations("Posts.Composer");
  const tPosts = useTranslations("Posts");
  const added = useRef(0);
  const locked = disabled || !editable;

  const refusing = selected.flatMap((channel) => {
    const taken = partsTaken(
      channel.platform,
      parts.length,
      options.find(({ channelId }) => channelId === channel.id)?.options
    );

    return taken._tag === "taken" ? [] : [{ channel, taken }];
  });

  return (
    <section aria-labelledby="parts-title" className="flex flex-col gap-3">
      <h2 id="parts-title" className="text-sm font-medium">
        {t("legend")}
      </h2>
      <p className="text-muted-foreground text-sm">{t("hint")}</p>
      {parts.length === 0 ? null : (
        <ol className="flex flex-col gap-3">
          {parts.map((part, index) => (
            <PartEditor
              key={part.key}
              count={parts.length}
              disabled={disabled}
              editable={editable}
              options={options}
              part={part}
              permissions={permissions}
              position={index + 2}
              selected={selected}
              workspaceId={workspaceId}
              onParts={onChange}
            />
          ))}
        </ol>
      )}
      {refusing.length === 0 ? null : (
        <ul className="text-destructive flex flex-col gap-1 text-sm">
          {refusing.map(({ channel, taken }) => {
            const named = tComposer("channelDetail", {
              handle: channel.handle,
              platform: tPosts("platform", { platform: channel.platform }),
            });

            return (
              <li key={channel.id}>
                {taken._tag === "alone"
                  ? t("alone", { channel: named })
                  : t("tooMany", { channel: named, maximum: taken.maximum })}
              </li>
            );
          })}
        </ul>
      )}
      {locked ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={roomForParts(parts) === 0}
            focusableWhenDisabled
            onClick={() => {
              added.current += 1;

              const key = `added-${String(added.current)}`;

              onChange((current) => addPart(current, key));
            }}
          >
            <PlusIcon data-icon="inline-start" />
            {t("add")}
          </Button>
          {roomForParts(parts) === 0 ? (
            <p className="text-muted-foreground text-xs">
              {t("full", { maximum: maxFollowUps })}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
};
