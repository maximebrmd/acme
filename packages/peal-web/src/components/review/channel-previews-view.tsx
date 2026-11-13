"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import type { TargetOptions } from "peal-contract";

import { PreviewedText } from "#components/review/previewed-text.tsx";
import { shownOptionsOf } from "#review/shown-options.ts";
import type { ShownOption } from "#review/shown-options.ts";
import { channelText } from "#review/use-chosen-words.ts";

/** An image, a video or a document the post shows. */
export interface PreviewedMedia {
  readonly altText: string;
  readonly kind: "document" | "image" | "video" | null;
  readonly mediaId: string;
  /** Where the file is read from; none for a file that cannot be shown. */
  readonly url: string | null;
}

/** A part that follows the post on a channel, as it will receive it. */
export interface PreviewedPart {
  /** The seconds it waits after the part before it went out. */
  readonly delaySeconds: number;
  readonly media: readonly PreviewedMedia[];
  readonly text: string;
}

/** A post on one channel, as the channel will receive it. */
export interface PreviewedChannel {
  readonly channelId: string;
  /** The parts that follow the post there, in order. */
  readonly followUps: readonly PreviewedPart[];
  /** The account's name; none once it was disconnected. */
  readonly handle: string | null;
  /**
   * The files the post shows there instead of its own, when the channel
   * has some of its own; left out where it shows the post's.
   */
  readonly media?: readonly PreviewedMedia[] | undefined;
  /** What the post has there that only its platform knows; none if none. */
  readonly options: TargetOptions | null;
  readonly platform: string | null;
  readonly text: string;
}

// A file, with the text that describes it to people who cannot see it,
// written out: reviewers check it as they check the post's text.
const MediaView = ({ media }: { readonly media: PreviewedMedia }) => {
  const t = useTranslations("Review");

  return (
    <figure className="flex flex-col gap-2">
      {media.url === null || media.kind === null ? (
        <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center rounded-lg text-sm">
          {t("preview.mediaUnavailable")}
        </div>
      ) : null}
      {media.url !== null && media.kind === "image" ? (
        // The file comes from the workspace's media store, at an address
        // that works two hours: it is shown as it is.
        <div className="bg-muted relative aspect-video overflow-hidden rounded-lg">
          <Image
            src={media.url}
            alt={media.altText}
            fill
            unoptimized
            referrerPolicy="no-referrer"
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-contain"
          />
        </div>
      ) : null}
      {media.url !== null && media.kind === "video" ? (
        <video
          src={media.url}
          controls
          preload="metadata"
          className="max-h-96 w-full rounded-lg"
          aria-label={media.altText === "" ? t("preview.video") : media.altText}
        >
          <track kind="captions" />
        </video>
      ) : null}
      {media.url !== null && media.kind === "document" ? (
        // A PDF, which only LinkedIn shows: opened beside the page, from the
        // same address that works two hours.
        <div className="bg-muted flex aspect-video flex-col items-center justify-center gap-2 rounded-lg p-4 text-center text-sm">
          <p>{t("preview.document")}</p>
          <a
            href={media.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary underline underline-offset-4"
          >
            {t("preview.openDocument")}
          </a>
        </div>
      ) : null}
      {media.kind === "document" ? null : (
        <figcaption className="text-muted-foreground text-xs">
          {media.altText === ""
            ? t("preview.noAltText")
            : t("preview.altText", { text: media.altText })}
        </figcaption>
      )}
    </figure>
  );
};

// What the post has on a channel besides its text (where a Pin leads, what
// a video is called and who sees it), under the composer's own names: an
// approval covers it, so reviewers read it with the text.
const OptionsView = ({ options }: { readonly options: TargetOptions }) => {
  const t = useTranslations("Review");
  const name = useTranslations("Posts.Options");

  const written = ({ value }: ShownOption) => {
    if (value.kind === "text") {
      return value.text;
    }

    return value.kind === "label"
      ? name(value.label)
      : t(value.kind === "yes" ? "preview.optionYes" : "preview.optionNo");
  };

  const shown = shownOptionsOf(options);

  return shown.length === 0 ? null : (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">{t("preview.options")}</p>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
        {shown.map((option) => (
          <div key={option.name} className="contents">
            <dt className="text-muted-foreground">
              {option.label === null ? option.name : name(option.label)}
            </dt>
            <dd dir="auto" className="break-words whitespace-pre-wrap">
              {written(option)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

// The parts that follow the post on a channel, in order: each with its
// place (the post itself is the first), its wait, its text and its files.
// An approval covers them, so reviewers read them with the post.
const PartsView = ({ parts }: { readonly parts: readonly PreviewedPart[] }) => {
  const t = useTranslations("Review");

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">{t("preview.partsLabel")}</p>
      <ol className="flex flex-col gap-3">
        {parts.map((part, index) => {
          const position = index + 2;

          return (
            <li key={position} className="flex flex-col gap-2 border-l-2 pl-3">
              <p className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-medium">
                  {t("preview.part", { position })}
                </span>
                {part.delaySeconds === 0 ? null : (
                  <span className="text-muted-foreground">
                    {t("preview.partDelay", { seconds: part.delaySeconds })}
                  </span>
                )}
              </p>
              <PreviewedText empty={t("preview.noText")} text={part.text} />
              {part.media.length === 0 ? null : (
                <section
                  aria-label={t("preview.partMediaLabel", { position })}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  {part.media.map((file) => (
                    <MediaView key={file.mediaId} media={file} />
                  ))}
                </section>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/**
 * The post as each channel will receive it: the channel's name and
 * platform, then the text it has there, as plain text, and the parts that
 * follow it. An honest preview,
 * not an imitation of the platform: line breaks are the post's, and the
 * platform lays it out its own way.
 */
export const ChannelPreviewsView = ({
  channels,
  media,
}: {
  readonly channels: readonly PreviewedChannel[];
  readonly media: readonly PreviewedMedia[];
}) => {
  const t = useTranslations("Review");

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {channels.map((channel) => (
          <li
            key={channel.channelId}
            className="flex flex-col gap-3 rounded-lg border p-4"
          >
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">
                {channel.handle ?? t("preview.disconnected")}
              </span>
              {channel.platform === null ? null : (
                <span className="text-muted-foreground text-sm">
                  {t("preview.platform", { platform: channel.platform })}
                </span>
              )}
            </p>
            <PreviewedText
              empty={t("preview.noText")}
              text={channel.text}
              {...channelText(channel.channelId)}
            />
            {channel.media === undefined ? null : (
              <section
                aria-label={t("preview.channelMediaLabel", {
                  handle: channel.handle ?? t("preview.disconnected"),
                })}
                className="grid gap-4 sm:grid-cols-2"
              >
                {channel.media.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("preview.noChannelMedia")}
                  </p>
                ) : (
                  channel.media.map((file) => (
                    <MediaView key={file.mediaId} media={file} />
                  ))
                )}
              </section>
            )}
            {channel.options === null ? null : (
              <OptionsView options={channel.options} />
            )}
            {channel.followUps.length === 0 ? null : (
              <PartsView parts={channel.followUps} />
            )}
          </li>
        ))}
      </ul>
      {media.length === 0 ? null : (
        <section
          aria-label={t("preview.mediaLabel")}
          className="grid gap-4 sm:grid-cols-2"
        >
          {media.map((file) => (
            <MediaView key={file.mediaId} media={file} />
          ))}
        </section>
      )}
    </div>
  );
};
