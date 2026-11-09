"use client";

import { Badge } from "acme-ui/components/badge";
import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useMediaProblemText } from "#components/posts/media-text.ts";
import type { MediaFit, MediaProblem } from "#posts/media-fit.ts";

// Tells one problem from the others of its channel: its kind, and which
// image or video it is about.
const problemKey = (problem: MediaProblem): string =>
  "position" in problem ? `${problem._tag}-${problem.position}` : problem._tag;

/**
 * What a channel's platform would refuse in the post's images and videos,
 * and, as a warning that does not keep the post from going out, how many
 * have no alt text where the platform shows it.
 */
export const MediaFitBadges = ({ fit }: { readonly fit: MediaFit }) => {
  const t = useTranslations("PostMedia.problem");
  const problemText = useMediaProblemText();

  return (
    <>
      {fit.problems.map((problem) => (
        <Badge key={problemKey(problem)} variant="destructive">
          {problemText(problem)}
        </Badge>
      ))}
      {fit.missingAltText === 0 ? null : (
        <Badge variant="outline">
          <TriangleAlertIcon aria-hidden data-icon="inline-start" />
          {t("missingAltText", { count: fit.missingAltText })}
        </Badge>
      )}
    </>
  );
};
