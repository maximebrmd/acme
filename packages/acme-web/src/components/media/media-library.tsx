"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Media, MediaStatus } from "acme-contract";
import { Alert, AlertDescription } from "acme-ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "acme-ui/components/alert-dialog";
import { Badge } from "acme-ui/components/badge";
import { Button } from "acme-ui/components/button";
import { Skeleton } from "acme-ui/components/skeleton";
import { DateTime, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { FilmIcon, ImageIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteMedia, mediaKey, mediaPage } from "#media/atoms.ts";

import { MediaUploader } from "./media-uploader.tsx";
import { useFileSize } from "./use-file-size.ts";
import { useHydrated } from "./use-hydrated.ts";

const badgeVariant = {
  pending: "outline",
  ready: "default",
  rejected: "destructive",
  uploaded: "secondary",
} as const satisfies Record<MediaStatus["_tag"], string>;

// The file itself, shown small: images as they are, videos by their first
// frame. Nothing is stored yet for pending media, nor any more for rejected.
const Thumbnail = ({ media }: { readonly media: Media }) => {
  const { url } = media;

  if (url === null) {
    const Icon = media.kind === "image" ? ImageIcon : FilmIcon;

    return (
      <div className="bg-muted flex size-full items-center justify-center">
        <Icon aria-hidden className="text-muted-foreground size-8" />
      </div>
    );
  }

  return media.kind === "image" ? (
    <Image
      src={url}
      alt={media.altText ?? ""}
      fill
      unoptimized
      sizes="(min-width: 768px) 16rem, 50vw"
      className="object-cover"
    />
  ) : (
    <video
      // Seeking a little in makes browsers fetch and show a first frame.
      src={`${url}#t=0.1`}
      muted
      playsInline
      preload="metadata"
      aria-label={media.altText ?? undefined}
      className="size-full object-cover"
    />
  );
};

// What the status means, when the badge alone does not say it.
const StatusDetail = ({ status }: { readonly status: MediaStatus }) => {
  const t = useTranslations("Media");

  if (status._tag === "uploaded") {
    return (
      <p className="text-muted-foreground text-xs">
        {t(`probe.${status.probe}`)}
      </p>
    );
  }

  if (status._tag === "rejected") {
    return (
      <p className="text-destructive-text text-xs">
        {t(`rejected.${status.reason}`)}
      </p>
    );
  }

  return null;
};

const DeleteMedia = ({
  media,
  workspaceId,
}: {
  readonly media: Media;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Media.library");
  const remove = useAtomSet(deleteMedia, { mode: "promiseExit" });
  const [open, setOpen] = useState(false);
  const [deleting, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const exit = await remove({
        params: { mediaId: media.id, workspaceId },
        reactivityKeys: [mediaKey(workspaceId)],
      });

      setOpen(false);

      if (exit._tag === "Success") {
        toast.success(t("deleted"));
      } else {
        toast.error(t("deleteFailed"));
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("deleteLabel", { kind: media.kind })}
          />
        }
      >
        <Trash2Icon aria-hidden />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("deleteTitle", { kind: media.kind })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            focusableWhenDisabled
            onClick={handleDelete}
          >
            {deleting ? t("deleting") : t("deleteConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const MediaCard = ({
  canDelete,
  media,
  workspaceId,
}: {
  readonly canDelete: boolean;
  readonly media: Media;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Media");
  const fileSize = useFileSize();

  const facts = [
    t("library.kind", { kind: media.kind }),
    fileSize(media.byteSize),
    ...(media.dimensions === null
      ? []
      : [t("library.dimensions", media.dimensions)]),
    ...(media.durationMs === null
      ? []
      : [
          t("library.duration", {
            seconds: Math.round(media.durationMs / 100) / 10,
          }),
        ]),
  ];

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border">
      <div className="relative aspect-square">
        <Thumbnail media={media} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={badgeVariant[media.status._tag]}>
            {t(`status.${media.status._tag}`)}
          </Badge>
          {canDelete ? (
            <DeleteMedia media={media} workspaceId={workspaceId} />
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">{facts.join(" · ")}</p>
        <StatusDetail status={media.status} />
        <p
          className={
            media.altText === null
              ? "text-muted-foreground text-sm italic"
              : "line-clamp-3 text-sm"
          }
        >
          {media.altText ?? t("library.noAltText")}
        </p>
        <p className="text-muted-foreground mt-auto text-xs">
          {t("library.added", { date: DateTime.toDate(media.createdAt) })}
        </p>
      </div>
    </li>
  );
};

const grid = "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4";

const LoadingGrid = () => {
  const t = useTranslations("Media.library");

  return (
    <div className={grid} aria-busy>
      <span className="sr-only">{t("loading")}</span>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="aspect-square" />
      ))}
    </div>
  );
};

// A page of the library, then the pages after it that "Show more" opened.
// Each page starts where the one before now ends, so media uploaded or
// deleted meanwhile never leave a gap or show twice.
const MediaPages = ({
  canDelete,
  cursor,
  more,
  onMore,
  workspaceId,
}: {
  readonly canDelete: boolean;
  readonly cursor: Option.Option<string>;
  // How many pages to show after this one.
  readonly more: number;
  readonly onMore: () => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Media.library");
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
    onInitial: () => <LoadingGrid />,
    onSuccess: ({ value }) => {
      if (Option.isNone(cursor) && value.items.length === 0) {
        return <p className="text-muted-foreground">{t("empty")}</p>;
      }

      const next = Option.fromNullOr(value.nextCursor);

      return (
        <>
          <ul className={grid}>
            {value.items.map((media) => (
              <MediaCard
                key={media.id}
                canDelete={canDelete}
                media={media}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
          {Option.isSome(next) && more > 0 ? (
            <MediaPages
              canDelete={canDelete}
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

/**
 * A workspace's media, newest first, with thumbnails, a page at a time, and
 * the uploader above them when the member may upload.
 */
export const MediaLibrary = ({
  canDelete,
  canUpload,
  workspaceId,
}: {
  readonly canDelete: boolean;
  readonly canUpload: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Media.library");
  const [more, setMore] = useState(0);
  // The list is fetched with the visitor's cookies, which only the browser
  // sends.
  const hydrated = useHydrated();

  const handleMore = () => {
    setMore((current) => current + 1);
  };

  return (
    <div className="flex flex-col gap-8">
      {canUpload ? <MediaUploader workspaceId={workspaceId} /> : null}
      <section className="flex flex-col gap-4" aria-labelledby="media-library">
        <h2 id="media-library" className="text-xl font-semibold">
          {t("title")}
        </h2>
        {hydrated ? (
          <MediaPages
            canDelete={canDelete}
            cursor={Option.none()}
            more={more}
            workspaceId={workspaceId}
            onMore={handleMore}
          />
        ) : (
          <LoadingGrid />
        )}
      </section>
    </div>
  );
};
