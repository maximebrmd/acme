"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { DateTime, Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Media, MediaStatus } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
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
} from "peal-ui/components/alert-dialog";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Link } from "#i18n/navigation.ts";
import { deleteMedia, mediaKey, mediaPage, usageOf } from "#media/atoms.ts";
import {
  everything,
  isNarrowed,
  searchDelayMs,
} from "#media/library-search.ts";
import type { LibrarySearch } from "#media/library-search.ts";
import { failureOf } from "#posts/outcome.ts";

import { GenerateImage } from "./generate-image.tsx";
import { SearchStatus } from "./library-status.tsx";
import { LibraryToolbarView } from "./library-toolbar.tsx";
import { MediaPreviewDialog, useMediaName } from "./media-preview.tsx";
import { MediaThumbnail } from "./media-thumbnail.tsx";
import { MediaUploader } from "./media-uploader.tsx";
import { MediaUsageNotice } from "./media-usage-notice.tsx";
import { useDebounced } from "./use-debounced.ts";
import { useHydrated } from "./use-hydrated.ts";
import { useMediaFacts } from "./use-media-facts.ts";

const badgeVariant = {
  pending: "outline",
  ready: "default",
  rejected: "destructive",
  uploaded: "secondary",
} as const satisfies Record<MediaStatus["_tag"], string>;

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

// Which posts show the media, asked when the dialog opens, and the buttons:
// deleting waits until the answer says no scheduled post needs it.
const DeleteConfirmation = ({
  deleting,
  media,
  onDelete,
  workspaceId,
}: {
  readonly deleting: boolean;
  readonly media: Media;
  readonly onDelete: () => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Media.library");
  const result = useAtomValue(usageOf(workspaceId, media.id));

  const blocked =
    AsyncResult.isInitial(result) ||
    (AsyncResult.isSuccess(result) && result.value.scheduled.length > 0);

  const notice = AsyncResult.isSuccess(result) ? (
    <MediaUsageNotice
      usage={result.value}
      postLinks={result.value.scheduled.map((postId, index) => (
        <Link
          key={postId}
          href={`/app/${workspaceId}/posts/${postId}`}
          className="underline underline-offset-4"
        >
          {t("inUsePost", { number: index + 1 })}
        </Link>
      ))}
    />
  ) : (
    <p
      className="text-muted-foreground text-sm"
      aria-busy={AsyncResult.isInitial(result)}
    >
      {AsyncResult.isFailure(result) ? t("usageFailed") : t("usageLoading")}
    </p>
  );

  return (
    <>
      {notice}
      <AlertDialogFooter>
        <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={deleting || blocked}
          focusableWhenDisabled
          onClick={onDelete}
        >
          {deleting ? t("deleting") : t("deleteConfirm")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
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

      if (Exit.isSuccess(exit)) {
        toast.success(t("deleted"));

        return;
      }

      const inUse = failureOf(exit).pipe(
        Option.exists(({ _tag }) => _tag === "MediaInUse")
      );

      toast.error(inUse ? t("inUseFailed") : t("deleteFailed"));
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
        {open ? (
          <DeleteConfirmation
            deleting={deleting}
            media={media}
            workspaceId={workspaceId}
            onDelete={handleDelete}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
};

// The thumbnail, a button that opens the file at full size, and gives the
// focus back to it when the dialog closes. Its focus ring is drawn inside
// it, as the card clips what overflows it.
const MediaPreview = ({ media }: { readonly media: Media }) => {
  const t = useTranslations("Media.library");
  const nameOf = useMediaName();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={opener}
        type="button"
        aria-label={t("preview", { name: nameOf(media) })}
        aria-haspopup="dialog"
        className="focus-visible:ring-ring relative block aspect-square w-full cursor-zoom-in outline-none focus-visible:ring-3 focus-visible:ring-inset"
        onClick={() => {
          setOpen(true);
        }}
      >
        <MediaThumbnail media={media} sizes="(min-width: 768px) 16rem, 50vw" />
      </button>
      <MediaPreviewDialog
        media={media}
        open={open}
        returnFocusTo={() => opener.current}
        onOpenChange={setOpen}
      />
    </>
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
  const facts = useMediaFacts(media);

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border">
      <MediaPreview media={media} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-1">
            <Badge variant={badgeVariant[media.status._tag]}>
              {t(`status.${media.status._tag}`)}
            </Badge>
            {media.aiGenerated ? (
              <Badge variant="secondary">{t("library.aiGenerated")}</Badge>
            ) : null}
          </span>
          {canDelete ? (
            <DeleteMedia media={media} workspaceId={workspaceId} />
          ) : null}
        </div>
        {media.fileName === null ? null : (
          <p className="truncate text-sm font-medium" title={media.fileName}>
            {media.fileName}
          </p>
        )}
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

// What the search found, in a status region that stays mounted while the
// search changes, so screen readers hear each answer.
const LibraryStatus = ({
  search,
  workspaceId,
}: {
  readonly search: LibrarySearch;
  readonly workspaceId: string;
}) => {
  const result = useAtomValue(mediaPage(workspaceId, Option.none(), search));

  return AsyncResult.isSuccess(result) ? (
    <SearchStatus
      count={result.value.items.length}
      more={result.value.nextCursor !== null}
      narrowed={isNarrowed(search)}
    />
  ) : (
    <SearchStatus count={0} more={false} narrowed={false} />
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
  onClear,
  onMore,
  search,
  workspaceId,
}: {
  readonly canDelete: boolean;
  readonly cursor: Option.Option<string>;
  // How many pages to show after this one.
  readonly more: number;
  readonly onClear: () => void;
  readonly onMore: () => void;
  readonly search: LibrarySearch;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Media.library");
  const page = mediaPage(workspaceId, cursor, search);
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
        return isNarrowed(search) ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted-foreground">{t("noMatch")}</p>
            <Button variant="outline" size="sm" onClick={onClear}>
              {t("clearSearch")}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">{t("empty")}</p>
        );
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
              search={search}
              workspaceId={workspaceId}
              onClear={onClear}
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
 * the uploader above them when the member may upload. The toolbar narrows
 * the list by text in a file's name or description and by kind, asking
 * the API once the person pauses (`searchDelayMs`); a thumbnail opens the
 * file at full size.
 */
export const MediaLibrary = ({
  canDelete,
  canGenerate = false,
  canUpload,
  mayConfigure = false,
  workspaceId,
}: {
  readonly canDelete: boolean;
  /** The member may have the assistant make images (assistant:use and media:upload). */
  readonly canGenerate?: boolean;
  /** The member may change the assistant's settings (assistant:configure). */
  readonly mayConfigure?: boolean;
  readonly canUpload: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Media.library");
  const [more, setMore] = useState(0);
  const [search, setSearch] = useState(everything);
  // What the list asks for: the search once the person paused typing.
  const asked = useDebounced(search, searchDelayMs);
  // The list is fetched with the visitor's cookies, which only the browser
  // sends.
  const hydrated = useHydrated();

  const handleMore = () => {
    setMore((current) => current + 1);
  };

  // Another search starts again from its first page.
  const handleSearch = (next: LibrarySearch) => {
    setSearch(next);
    setMore(0);
  };

  const searchField = useRef<HTMLInputElement>(null);

  // The button that cleared the search goes with the message it stood
  // in: the focus goes back to the search field.
  const handleClear = () => {
    handleSearch(everything);
    searchField.current?.focus();
  };

  return (
    <div className="flex flex-col gap-8">
      {canUpload ? <MediaUploader workspaceId={workspaceId} /> : null}
      {canGenerate && hydrated ? (
        <div>
          <GenerateImage
            mayConfigure={mayConfigure}
            workspaceId={workspaceId}
          />
        </div>
      ) : null}
      <section className="flex flex-col gap-4" aria-labelledby="media-library">
        <h2 id="media-library" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <LibraryToolbarView
          inputRef={searchField}
          search={search}
          onSearch={handleSearch}
        />
        {hydrated ? (
          <LibraryStatus search={asked} workspaceId={workspaceId} />
        ) : null}
        {hydrated ? (
          <MediaPages
            canDelete={canDelete}
            cursor={Option.none()}
            more={more}
            search={asked}
            workspaceId={workspaceId}
            onClear={handleClear}
            onMore={handleMore}
          />
        ) : (
          <LoadingGrid />
        )}
      </section>
    </div>
  );
};
