"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { Media } from "acme-contract";
import { Alert, AlertDescription } from "acme-ui/components/alert";
import { Badge } from "acme-ui/components/badge";
import { Button } from "acme-ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "acme-ui/components/dialog";
import { Skeleton } from "acme-ui/components/skeleton";
import { DateTime, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { CheckIcon, LibraryIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { MediaThumbnail } from "#components/media/media-thumbnail.tsx";
import { mediaPage } from "#media/atoms.ts";

const grid = "grid grid-cols-2 gap-3 sm:grid-cols-3";

interface Choice {
  /** Already in the post. */
  readonly attached: ReadonlySet<string>;
  /** Picked so far, in order. */
  readonly picked: readonly Media[];
  /** How many more the post can take. */
  readonly room: number;
  readonly onToggle: (media: Media) => void;
}

// One piece of media: a toggle once it is ready and not yet in the post.
const MediaChoice = ({
  choice,
  media,
}: {
  readonly choice: Choice;
  readonly media: Media;
}) => {
  const t = useTranslations("PostMedia.picker");
  const order = choice.picked.findIndex(({ id }) => id === media.id) + 1;
  const attached = choice.attached.has(media.id);
  const ready = media.status._tag === "ready";
  const full = order === 0 && choice.picked.length >= choice.room;

  const state = (() => {
    if (attached) {
      return t("attachedAlready");
    }

    if (!ready) {
      return t("notReady");
    }

    return order === 0 ? null : t("picked", { order });
  })();

  return (
    <li>
      <button
        type="button"
        aria-pressed={order > 0}
        disabled={attached || !ready || full}
        className="group/option border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:ring-primary/30 flex w-full flex-col overflow-hidden rounded-lg border text-left outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:ring-3"
        onClick={() => {
          choice.onToggle(media);
        }}
      >
        <span aria-hidden className="relative block aspect-square">
          <MediaThumbnail
            media={media}
            sizes="(min-width: 640px) 12rem, 50vw"
          />
          {order > 0 ? (
            <Badge className="absolute top-2 right-2">
              <CheckIcon data-icon="inline-start" />
              {order}
            </Badge>
          ) : null}
        </span>
        <span className="flex flex-col gap-1 p-2 text-xs">
          <span className="font-medium">
            {t("option", {
              date: DateTime.toDate(media.createdAt),
              kind: media.kind,
            })}
          </span>
          {media.altText === null ? null : (
            <span className="text-muted-foreground line-clamp-2">
              {media.altText}
            </span>
          )}
          {state === null ? null : (
            <span className="text-muted-foreground">{state}</span>
          )}
        </span>
      </button>
    </li>
  );
};

const Loading = () => {
  const t = useTranslations("PostMedia.picker");

  return (
    <div className={grid} aria-busy>
      <span className="sr-only">{t("loading")}</span>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="aspect-square" />
      ))}
    </div>
  );
};

// A page of the library, then the pages after it that "Show more" opened.
const Pages = ({
  choice,
  cursor,
  more,
  onMore,
  workspaceId,
}: {
  readonly choice: Choice;
  readonly cursor: Option.Option<string>;
  // How many pages to show after this one.
  readonly more: number;
  readonly onMore: () => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("PostMedia.picker");
  const page = mediaPage(workspaceId, cursor);
  const result = useAtomValue(page);
  const reload = useAtomRefresh(page);

  return AsyncResult.match(result, {
    onFailure: () => (
      <Alert variant="destructive">
        <AlertDescription>
          <span className="flex flex-wrap items-center justify-between gap-2">
            {t("loadFailed")}
            <Button variant="outline" size="sm" onClick={reload}>
              {t("reload")}
            </Button>
          </span>
        </AlertDescription>
      </Alert>
    ),
    onInitial: () => <Loading />,
    onSuccess: ({ value }) => {
      if (Option.isNone(cursor) && value.items.length === 0) {
        return <p className="text-muted-foreground">{t("empty")}</p>;
      }

      const next = Option.fromNullOr(value.nextCursor);

      return (
        <>
          <ul className={grid}>
            {value.items.map((media) => (
              <MediaChoice key={media.id} choice={choice} media={media} />
            ))}
          </ul>
          {Option.isSome(next) && more > 0 ? (
            <Pages
              choice={choice}
              cursor={next}
              more={more - 1}
              workspaceId={workspaceId}
              onMore={onMore}
            />
          ) : null}
          {Option.isSome(next) && more === 0 ? (
            <Button variant="outline" className="self-center" onClick={onMore}>
              {t("loadMore")}
            </Button>
          ) : null}
        </>
      );
    },
  });
};

interface MediaPickerProps {
  /** The media the post shows already. */
  readonly attached: readonly string[];
  readonly disabled: boolean;
  readonly onPick: (media: readonly Media[]) => void;
  /** How many more the post can show. */
  readonly room: number;
  readonly workspaceId: string;
}

/**
 * Picks images and videos from the workspace's library, newest first, in
 * the order the post should show them: only ready media, not yet in the
 * post, as many as it has room for.
 */
export const MediaPicker = ({
  attached,
  disabled,
  onPick,
  room,
  workspaceId,
}: MediaPickerProps) => {
  const t = useTranslations("PostMedia.picker");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<readonly Media[]>([]);
  const [more, setMore] = useState(0);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setPicked([]);
    setMore(0);
  };

  const choice: Choice = {
    attached: new Set(attached),
    onToggle: (media) => {
      setPicked((current) =>
        current.some(({ id }) => id === media.id)
          ? current.filter(({ id }) => id !== media.id)
          : [...current, media]
      );
    },
    picked,
    room,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="outline" disabled={disabled || room === 0} />}
      >
        <LibraryIcon aria-hidden data-icon="inline-start" />
        {t("open")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto p-1">
          <output className="text-muted-foreground text-sm">
            {t("room", { count: Math.max(0, room - picked.length) })}
          </output>
          {open ? (
            <Pages
              choice={choice}
              cursor={Option.none()}
              more={more}
              workspaceId={workspaceId}
              onMore={() => {
                setMore((current) => current + 1);
              }}
            />
          ) : null}
        </div>
        <DialogFooter closeLabel={t("cancel")}>
          <Button
            disabled={picked.length === 0}
            onClick={() => {
              onPick(picked);
              handleOpenChange(false);
            }}
          >
            {t("attach", { count: picked.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
