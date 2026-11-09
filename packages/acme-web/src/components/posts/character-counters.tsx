"use client";

import type { Channel } from "acme-contract";
import { Badge } from "acme-ui/components/badge";
import { useTranslations } from "next-intl";

import type { ChannelFit, ChannelProblem } from "#posts/character-count.ts";

const countsOf = (problem: ChannelProblem) =>
  problem._tag === "empty" || problem._tag === "mediaRequired"
    ? { count: 0, maximum: 0 }
    : { count: problem.count, maximum: problem.maximum };

interface CharacterCountersProps {
  readonly fits: readonly {
    readonly channel: Channel;
    readonly fit: ChannelFit;
  }[];
}

// For each channel the post goes to, how long its text is against the
// platform's closest limit, and what else the platform would refuse. It is
// a live region, so screen readers hear a channel go over its limit.
export const CharacterCounters = ({ fits }: CharacterCountersProps) => {
  const t = useTranslations("Posts.Composer");
  const tPosts = useTranslations("Posts");

  if (fits.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t("countersEmpty")}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2" aria-live="polite">
      {fits.map(({ channel, fit }) => {
        const { tightest } = fit;

        return (
          <li
            key={channel.id}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span className="truncate">
              {t("channelDetail", {
                handle: channel.handle,
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
  );
};
