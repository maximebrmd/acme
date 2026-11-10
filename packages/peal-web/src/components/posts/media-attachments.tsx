"use client";

import { useAtomValue } from "@effect/atom-react";
import { Array as Arr, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { Media, MediaAttachment, Platform } from "peal-contract";
import { maxAltTextLength, maxMediaPerPost } from "peal-contract/post-text";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import { Skeleton } from "peal-ui/components/skeleton";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";

import { MediaThumbnail } from "#components/media/media-thumbnail.tsx";
import { MediaUploader } from "#components/media/media-uploader.tsx";
import { useFileSize } from "#components/media/use-file-size.ts";
import { MediaPicker } from "#components/posts/media-picker.tsx";
import { mediaItem } from "#posts/attached-media.ts";
import {
  attach,
  describe,
  detach,
  lacksAltText,
  move,
  roomLeft,
} from "#posts/attachments.ts";
import { showsAltText } from "#posts/media-fit.ts";
import type { AttachedMedia } from "#posts/media-fit.ts";

type Kind = Media["kind"] | "other";

const kindOf = (media: Option.Option<Media>): Kind =>
  Option.match(media, { onNone: () => "other", onSome: ({ kind }) => kind });

// What the row says of the file: its kind, size, dimensions and duration.
const useFacts = () => {
  const t = useTranslations("Media.library");
  const fileSize = useFileSize();

  return (media: Media): string =>
    [
      t("kind", { kind: media.kind }),
      fileSize(media.byteSize),
      ...(media.dimensions === null ? [] : [t("dimensions", media.dimensions)]),
      ...(media.durationMs === null
        ? []
        : [
            t("duration", {
              seconds: Math.round(media.durationMs / 100) / 10,
            }),
          ]),
    ].join(" · ");
};

interface RowProps {
  readonly count: number;
  readonly disabled: boolean;
  readonly item: AttachedMedia;
  readonly onAltText: (altText: string) => void;
  readonly onMove: (offset: number, button: HTMLButtonElement) => void;
  readonly onRemove: () => void;
  /** The platforms the post goes to that show alt text, by name. */
  readonly platforms: readonly string[];
  readonly position: number;
  readonly workspaceId: string;
}

// One image or video of the post: what it is, its alt text, and buttons to
// move it or take it out.
const AttachmentRow = ({
  count,
  disabled,
  item,
  onAltText,
  onMove,
  onRemove,
  platforms,
  position,
  workspaceId,
}: RowProps) => {
  const t = useTranslations("PostMedia");
  const format = useFormatter();
  const facts = useFacts();
  const result = useAtomValue(mediaItem(workspaceId, item.mediaId));
  const media = AsyncResult.value(result);
  const altId = useId();
  const named = { kind: kindOf(media), position };

  const missing = lacksAltText(item);

  const hint = (() => {
    if (!missing) {
      return t("altTextHint");
    }

    return platforms.length === 0
      ? t("altTextEncouraged")
      : t("altTextMissing", {
          count: platforms.length,
          kind: named.kind,
          platforms: format.list(platforms, { type: "conjunction" }),
        });
  })();

  const status = Option.match(media, {
    onNone: () =>
      AsyncResult.isFailure(result) ? t("loadFailed") : t("loading"),
    onSome: facts,
  });

  return (
    <li className="flex gap-3 rounded-lg border p-3">
      <div
        aria-hidden
        className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-md"
      >
        {Option.isSome(media) ? (
          <MediaThumbnail media={media.value} sizes="5rem" />
        ) : (
          <Skeleton className="size-full" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <p className="text-sm font-medium">{t("item", named)}</p>
            <p className="text-muted-foreground truncate text-xs">{status}</p>
          </div>
          {disabled ? null : (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("moveEarlier", named)}
                disabled={position === 1}
                focusableWhenDisabled
                onClick={(event) => {
                  onMove(-1, event.currentTarget);
                }}
              >
                <ArrowUpIcon aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("moveLater", named)}
                disabled={position === count}
                focusableWhenDisabled
                onClick={(event) => {
                  onMove(1, event.currentTarget);
                }}
              >
                <ArrowDownIcon aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("remove", named)}
                onClick={onRemove}
              >
                <XIcon aria-hidden />
              </Button>
            </div>
          )}
        </div>
        <Label htmlFor={altId}>{t("altTextLabel", named)}</Label>
        <Textarea
          id={altId}
          value={item.altText}
          maxLength={maxAltTextLength}
          disabled={disabled}
          aria-describedby={`${altId}-hint`}
          onChange={(event) => {
            onAltText(event.target.value);
          }}
        />
        <p
          id={`${altId}-hint`}
          className="text-muted-foreground flex items-start gap-1 text-xs"
        >
          {missing ? (
            <TriangleAlertIcon aria-hidden className="mt-px size-3 shrink-0" />
          ) : null}
          {hint}
        </p>
      </div>
    </li>
  );
};

interface MediaAttachmentsProps {
  /** The post's attachments, with their media once loaded. */
  readonly attached: readonly AttachedMedia[];
  /** The member may pick from the library (media:read). */
  readonly canBrowse: boolean;
  /** The member may upload (media:upload). */
  readonly canUpload: boolean;
  /** Nothing changes for now, as while the post is being saved. */
  readonly disabled: boolean;
  /**
   * The post can still take media: a draft the member may write, possibly
   * disabled for a moment. Without it, the section only shows the post's
   * media. Defaults to `!disabled`.
   */
  readonly editable?: boolean;
  /**
   * Changes the attachments from what they are now: a state setter, or
   * anything that applies the update to the list it holds.
   */
  readonly onChange: (
    update: (current: readonly MediaAttachment[]) => readonly MediaAttachment[]
  ) => void;
  /** The platforms of the channels the post goes to. */
  readonly platforms: readonly Platform[];
  readonly workspaceId: string;
}

/**
 * The images and videos the post shows, in order, each with its alt text,
 * which the field encourages and, where a platform the post goes to shows
 * it, warns about while it is missing. Media comes from the library or
 * from files uploaded here, which join the post once ready. Every action
 * is a button, and what moving or removing did is announced.
 *
 * The uploader stays on the page while the post is editable, disabled when
 * the section is or the post is full: taking it off would cancel the files
 * it is still sending.
 */
export const MediaAttachments = ({
  attached,
  canBrowse,
  canUpload,
  disabled,
  editable = !disabled,
  onChange,
  platforms,
  workspaceId,
}: MediaAttachmentsProps) => {
  const t = useTranslations("PostMedia");
  const tMedia = useTranslations("Media");
  const tPosts = useTranslations("Posts");
  const [announcement, setAnnouncement] = useState("");
  const list = useRef<HTMLOListElement>(null);
  const region = useRef<HTMLDivElement>(null);

  const room = roomLeft(attached);
  const count = attached.length;

  const showing = Arr.dedupe(platforms.filter(showsAltText)).map((platform) =>
    tPosts("platform", { platform })
  );

  const add = (added: readonly Media[]) => {
    const ids = new Set(attached.map(({ mediaId }) => mediaId));

    const fresh = Arr.dedupeWith(
      added.filter(({ id }) => !ids.has(id)),
      (left, right) => left.id === right.id
    );

    const dropped = Math.max(0, fresh.length - room);

    onChange((current) => attach(current, fresh));

    if (dropped > 0) {
      toast.warning(t("full", { count: dropped, maximum: maxMediaPerPost }));
    }

    setAnnouncement(t("attached", { count: fresh.length - dropped }));
  };

  // An upload that ended without ready media stays in the library only.
  const handleUploaded = (media: Media) => {
    if (media.status._tag === "ready") {
      add([media]);

      return;
    }

    toast.warning(
      media.status._tag === "uploaded"
        ? tMedia(`probe.${media.status.probe}`)
        : t("notReady")
    );
  };

  const handleMove = (
    item: AttachedMedia,
    from: number,
    offset: number,
    button: HTMLButtonElement
  ) => {
    const to = Math.min(Math.max(from + offset, 0), count - 1);

    // The row is moved in the page, not made again: its button can take the
    // focus back once the move is rendered.
    flushSync(() => {
      onChange((current) => move(current, item.mediaId, offset));
    });
    button.focus();
    setAnnouncement(
      t("moved", { count, kind: kindOf(item.media), position: to + 1 })
    );
  };

  // The focus goes to the alt text of the row that takes the removed one's
  // place, or the one before, or the section once none is left.
  const handleRemove = (item: AttachedMedia, index: number) => {
    flushSync(() => {
      onChange((current) => detach(current, item.mediaId));
    });

    const fields = [...(list.current?.querySelectorAll("textarea") ?? [])];

    (fields[Math.min(index, fields.length - 1)] ?? region.current)?.focus();
    setAnnouncement(t("removed", { kind: kindOf(item.media) }));
  };

  return (
    <div
      ref={region}
      tabIndex={-1}
      className="flex flex-col gap-4 outline-none"
    >
      <p className="text-muted-foreground text-sm">
        {t("count", { count, maximum: maxMediaPerPost })}
      </p>
      {count === 0 ? null : (
        <ol ref={list} aria-label={t("list")} className="flex flex-col gap-3">
          {attached.map((item, index) => (
            <AttachmentRow
              key={item.mediaId}
              count={count}
              disabled={disabled}
              item={item}
              platforms={showing}
              position={index + 1}
              workspaceId={workspaceId}
              onAltText={(altText) => {
                onChange((current) => describe(current, item.mediaId, altText));
              }}
              onMove={(offset, button) => {
                handleMove(item, index, offset, button);
              }}
              onRemove={() => {
                handleRemove(item, index);
              }}
            />
          ))}
        </ol>
      )}
      <output className="sr-only">{announcement}</output>
      {editable ? (
        <div className="flex flex-col gap-3">
          {canBrowse ? (
            <div>
              <MediaPicker
                attached={attached.map(({ mediaId }) => mediaId)}
                disabled={disabled}
                room={room}
                workspaceId={workspaceId}
                onPick={add}
              />
            </div>
          ) : null}
          {canUpload ? (
            <MediaUploader
              disabled={disabled || room === 0}
              workspaceId={workspaceId}
              onUploaded={handleUploaded}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
