"use client";

import { useTranslations } from "next-intl";
import type { Channel } from "peal-contract";
import { Badge } from "peal-ui/components/badge";

import { channelName } from "#channels/channel-name.ts";
import { MediaFitBadges } from "#components/posts/media-fit-badges.tsx";
import { fits as takesPost } from "#posts/character-count.ts";
import type { ChannelFit, ChannelProblem } from "#posts/character-count.ts";
import { mediaFits } from "#posts/media-fit.ts";
import type { MediaFit } from "#posts/media-fit.ts";

const countsOf = (problem: ChannelProblem) => {
  if (problem._tag === "forbiddenCharacters") {
    return { characters: problem.characters.join(" "), count: 0, maximum: 0 };
  }

  return problem._tag === "empty" || problem._tag === "mediaRequired"
    ? { characters: "", count: 0, maximum: 0 }
    : { characters: "", count: problem.count, maximum: problem.maximum };
};

interface CharacterCountersProps {
  readonly fits: readonly {
    readonly channel: Channel;
    readonly fit: ChannelFit;
    /** How the post's images and videos fit, when it has any. */
    readonly media?: MediaFit;
  }[];
}

// For each channel the post goes to, how long its text is against the
// platform's closest limit, and what else the platform would refuse, its
// images and videos included. The counts change with every key, so they are
// not announced; a status says how many channels would refuse the post,
// which screen readers hear only when that number changes.
export const CharacterCounters = ({ fits }: CharacterCountersProps) => {
  const t = useTranslations("Posts.Composer");
  const tPosts = useTranslations("Posts");
  const tFormats = useTranslations("Posts.Formats");

  if (fits.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t("countersEmpty")}</p>
    );
  }

  const refusing = fits.filter(
    ({ fit, media }) =>
      !takesPost(fit) || (media !== undefined && !mediaFits(media))
  ).length;

  return (
    <div className="flex flex-col gap-2">
      <output className="sr-only">
        {t("fitSummary", { count: refusing })}
      </output>
      <ul className="flex flex-col gap-2">
        {fits.map(({ channel, fit, media }) => {
          const { tightest } = fit;

          return (
            <li
              key={channel.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span className="truncate">
                {t("channelDetail", {
                  handle: channelName(channel),
                  platform: tPosts("platform", { platform: channel.platform }),
                })}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {fit.problems.map((problem) => (
                  <Badge key={problem._tag} variant="destructive">
                    {t("problem", {
                      ...countsOf(problem),
                      problem: problem._tag,
                    })}
                  </Badge>
                ))}
                {media === undefined ? null : <MediaFitBadges fit={media} />}
                {tightest === undefined ? (
                  <span className="text-muted-foreground">{t("noLimit")}</span>
                ) : (
                  <Badge
                    variant={tightest.remaining < 0 ? "destructive" : "outline"}
                  >
                    {t("count", {
                      length: tightest.length,
                      maximum: tightest.maximum,
                      unit: tightest.unit,
                    })}
                  </Badge>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {fits.some(({ fit }) => fit.textNotSent === true) ? (
        <p className="text-muted-foreground text-sm">
          {tFormats("textNotSent")}
        </p>
      ) : null}
    </div>
  );
};
