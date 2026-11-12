"use client";

import { Option } from "effect";
import { useTranslations } from "next-intl";
import type { Channel, ChannelPreview, TextCount } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";

import { channelName } from "#channels/channel-name.ts";
import { MediaThumbnail } from "#components/media/media-thumbnail.tsx";
import { PreviewedText } from "#components/review/previewed-text.tsx";
import type { AttachedMedia } from "#posts/media-fit.ts";
import type { PreviewState } from "#posts/post-preview.ts";

/** What the previews hold of the check's answer: a channel each. */
export interface PreviewAnswer {
  readonly channels: readonly ChannelPreview[];
}

const Counts = ({ counts }: { readonly counts: readonly TextCount[] }) => {
  const t = useTranslations("Posts.Composer");

  return counts.length === 0 ? null : (
    <p className="flex flex-wrap gap-1">
      {counts.map(({ length, maximum, unit }) => (
        <Badge
          key={unit}
          variant={length > maximum ? "destructive" : "outline"}
        >
          {t("count", { length, maximum, unit })}
        </Badge>
      ))}
    </p>
  );
};

const Thumbnails = ({
  label,
  media,
}: {
  readonly label: string;
  readonly media: readonly AttachedMedia[];
}) =>
  media.length === 0 ? null : (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {media.map((item) => (
        <li
          key={item.mediaId}
          className="bg-muted relative size-14 overflow-hidden rounded-md"
        >
          {Option.isSome(item.media) ? (
            <MediaThumbnail media={item.media.value} sizes="3.5rem" />
          ) : (
            <Skeleton className="size-full" />
          )}
        </li>
      ))}
    </ul>
  );

// One channel: its name and platform, whether it would be refused, the
// text it receives with its counts, its media, then its parts.
const ChannelPanel = ({
  channel,
  media,
  parts,
  preview,
}: {
  readonly channel: Channel | undefined;
  readonly media: readonly AttachedMedia[];
  readonly parts: readonly (readonly AttachedMedia[])[];
  readonly preview: ChannelPreview;
}) => {
  const t = useTranslations("Posts.Preview");
  const tPosts = useTranslations("Posts");

  const name =
    channel === undefined
      ? tPosts("disconnectedChannel")
      : channelName(channel);

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground text-sm">
          {tPosts("platform", { platform: preview.platform })}
        </span>
      </p>
      {preview.violations.length === 0 ? null : (
        <p className="text-destructive-text text-sm">{t("refused")}</p>
      )}
      <PreviewedText empty={t("noText")} text={preview.text} />
      {preview.textNotSent === true ? (
        <p className="text-muted-foreground text-sm">{t("textNotSent")}</p>
      ) : null}
      <Counts counts={preview.textCounts} />
      <Thumbnails label={t("media", { channel: name })} media={media} />
      {preview.parts.length === 0 ? null : (
        <ol className="flex flex-col gap-3">
          {preview.parts.map((part) => {
            const position = part.part + 1;

            return (
              <li
                key={part.part}
                className="flex flex-col gap-2 border-l-2 pl-3"
              >
                <p className="text-sm font-medium">{t("part", { position })}</p>
                <PreviewedText empty={t("noText")} text={part.text} />
                <Counts counts={part.textCounts} />
                <Thumbnails
                  label={t("partMedia", { position })}
                  media={parts[part.part - 1] ?? []}
                />
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
};

/**
 * What each channel the post goes to will receive, from the server's own
 * check (`posts.validate`): plain text, its counts, its media and its
 * parts, never an imitation of the platform. While a newer check runs the
 * last one stays, dimmed; a failure says so, with a way to ask again, and
 * the composer works without it. A member who may not read what a check
 * needs sees nothing.
 */
export const PostPreviewsView = ({
  channels,
  media,
  onRetry,
  parts,
  selected,
  shortenLinks,
  state,
  waitingForOptions,
}: {
  readonly channels: readonly Channel[];
  /** The post's images and videos, in order. */
  readonly media: readonly AttachedMedia[];
  readonly onRetry: () => void;
  /** Each part's images and videos, in the parts' order. */
  readonly parts: readonly (readonly AttachedMedia[])[];
  /** How many channels the post goes to. */
  readonly selected: number;
  /** Whether its links go out shortened. */
  readonly shortenLinks: boolean;
  readonly state: PreviewState<PreviewAnswer>;
  /** Whether an option is one the API would refuse: nothing is asked then. */
  readonly waitingForOptions: boolean;
}) => {
  const t = useTranslations("Posts.Preview");

  if (state.status === "forbidden") {
    return null;
  }

  const dimmed = state.status === "loading" || waitingForOptions;

  const body = () => {
    if (selected === 0) {
      return (
        <p className="text-muted-foreground text-sm">{t("nothingSelected")}</p>
      );
    }

    if (state.shown === null) {
      return state.status === "failed" ? null : (
        <div className="flex flex-col gap-2" aria-busy>
          <span className="sr-only">{t("updating")}</span>
          <Skeleton className="h-24" />
        </div>
      );
    }

    return (
      <ul
        aria-busy={state.status === "loading"}
        className={
          dimmed
            ? "flex flex-col gap-3 opacity-60 transition-opacity"
            : "flex flex-col gap-3 transition-opacity"
        }
      >
        {state.shown.channels.map((preview) => (
          <ChannelPanel
            key={preview.channelId}
            channel={channels.find(({ id }) => id === preview.channelId)}
            media={media}
            parts={parts}
            preview={preview}
          />
        ))}
      </ul>
    );
  };

  return (
    <section aria-labelledby="previews-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="previews-title" className="text-sm font-medium">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-xs">{t("description")}</p>
        {shortenLinks ? (
          <p className="text-muted-foreground text-xs">{t("shortLinks")}</p>
        ) : null}
      </div>
      {selected > 0 && waitingForOptions ? (
        <p className="text-muted-foreground text-sm">
          {t("waitingForOptions")}
        </p>
      ) : null}
      {selected > 0 && state.status === "failed" ? (
        <Alert variant="destructive">
          <AlertDescription>
            <span className="flex flex-wrap items-center justify-between gap-2">
              {t("failed")}
              <Button variant="outline" size="sm" onClick={onRetry}>
                {t("retry")}
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      ) : null}
      {body()}
    </section>
  );
};
