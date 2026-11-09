"use client";

import type { Channel, ContentViolation, Platform } from "acme-contract";
import { Alert, AlertDescription, AlertTitle } from "acme-ui/components/alert";
import { Match, Option } from "effect";
import { useTranslations } from "next-intl";

import { useMediaViolationTexts } from "#components/posts/media-text.ts";
import type { ComposerFailure } from "#posts/composer-failure.ts";
import type { AttachedMedia } from "#posts/media-fit.ts";
import { fieldOf } from "#posts/target-options.ts";

/**
 * What tells a violation from the others in the list: its kind and channel,
 * and for a text too long the unit, since a platform with two limits, such
 * as Bluesky's graphemes and bytes, can see both broken at once.
 */
export const violationKey = (violation: ContentViolation): string => {
  if (violation._tag === "noChannels") {
    return violation._tag;
  }

  const unit = violation._tag === "textTooLong" ? `-${violation.unit}` : "";
  const media = "mediaId" in violation ? `-${violation.mediaId}` : "";
  const field = "field" in violation ? `-${violation.field}` : "";

  return `${violation._tag}-${violation.channelId}${unit}${media}${field}`;
};

interface ComposerErrorsProps {
  readonly channels: readonly Channel[];
  readonly failure: ComposerFailure | null;
  /** The post's images and videos, to tell which one a violation is about. */
  readonly media?: readonly AttachedMedia[];
}

const noMedia: readonly AttachedMedia[] = [];

// Why the last save or schedule failed, with each of the platforms' rules
// the content breaks, channel by channel, and image by image.
export const ComposerErrors = ({
  channels,
  failure,
  media = noMedia,
}: ComposerErrorsProps) => {
  const t = useTranslations("Posts.Composer");
  const tPosts = useTranslations("Posts");
  const tOptions = useTranslations("Posts.Options");
  const billing = useTranslations("Billing");

  // An option's label, as its platform's fields name it.
  const fieldName = (violation: { platform: Platform; field: string }) =>
    Option.match(fieldOf(violation.platform, violation.field), {
      onNone: () => tOptions("unknownField"),
      onSome: ({ label }) => tOptions(label),
    });

  // Why the platform refuses an option's value, as its field says.
  const fieldReason = (violation: { platform: Platform; field: string }) =>
    Option.match(fieldOf(violation.platform, violation.field), {
      onNone: () => tOptions("invalid"),
      onSome: ({ invalid }) =>
        invalid === undefined ? tOptions("invalid") : tOptions(invalid),
    });

  const channelName = (channelId: string) => {
    const channel = channels.find(({ id }) => id === channelId);

    return channel === undefined
      ? tPosts("disconnectedChannel")
      : t("channelDetail", {
          handle: channel.handle,
          platform: tPosts("platform", { platform: channel.platform }),
        });
  };

  const mediaTexts = useMediaViolationTexts(media, channelName);

  if (failure === null) {
    return null;
  }

  const violationText = (violation: ContentViolation) =>
    Match.valueTags(violation, {
      ...mediaTexts,
      empty: ({ channelId }) =>
        t("violation.empty", { channel: channelName(channelId) }),
      mediaRequired: ({ channelId }) =>
        t("violation.mediaRequired", { channel: channelName(channelId) }),
      noChannels: () => t("violation.noChannels"),
      optionInvalid: (option) =>
        t("violation.optionInvalid", {
          channel: channelName(option.channelId),
          reason: fieldReason(option),
        }),
      optionMissing: (option) =>
        t("violation.optionMissing", {
          channel: channelName(option.channelId),
          field: fieldName(option),
        }),
      optionTooLong: (option) =>
        t("violation.optionTooLong", {
          channel: channelName(option.channelId),
          field: fieldName(option),
          length: option.length,
          maximum: option.maximum,
        }),
      optionsForOtherPlatform: ({ channelId, optionsPlatform }) =>
        t("violation.optionsForOtherPlatform", {
          channel: channelName(channelId),
          platform: tPosts("platform", { platform: optionsPlatform }),
        }),
      optionsWithoutChannel: () => t("violation.optionsWithoutChannel"),
      overrideWithoutChannel: () => t("violation.overrideWithoutChannel"),
      textTooLong: ({ channelId, length, maximum, unit }) =>
        t("violation.textTooLong", {
          channel: channelName(channelId),
          length,
          maximum,
          unit,
        }),
      tooManyHashtags: ({ channelId, count, maximum }) =>
        t("violation.tooManyHashtags", {
          channel: channelName(channelId),
          count,
          maximum,
        }),
      tooManyLinks: ({ channelId, count, maximum }) =>
        t("violation.tooManyLinks", {
          channel: channelName(channelId),
          count,
          maximum,
        }),
      tooManyMedia: ({ channelId, count, maximum }) =>
        t("violation.tooManyMedia", {
          channel: channelName(channelId),
          count,
          maximum,
        }),
      tooManyMentions: ({ channelId, count, maximum }) =>
        t("violation.tooManyMentions", {
          channel: channelName(channelId),
          count,
          maximum,
        }),
    });

  const generic = () => t("errors.generic");

  const message = Match.valueTags(failure, {
    Forbidden: () => t("errors.forbidden"),
    InvalidTime: () => t("invalidTime"),
    InvalidTimeZone: () => t("errors.timeZone"),
    PlanLimitReached: ({ limit }) => billing("limitReached", { limit }),
    PostContentInvalid: () => t("errors.content"),
    PostNotFound: () => t("errors.notFound"),
    PostStatusConflict: ({ status }) => t("errors.conflict", { status }),
    ScheduleInPast: () => t("errors.inPast"),
    Unauthenticated: generic,
    Unexpected: generic,
    UnknownChannels: () => t("errors.unknownChannels"),
    UnknownMedia: () => t("errors.unknownMedia"),
    WorkspaceNotFound: generic,
  });

  return (
    <Alert variant="destructive" aria-live="assertive">
      <AlertTitle>{message}</AlertTitle>
      {failure._tag === "PostContentInvalid" ? (
        <AlertDescription>
          <ul className="list-disc pl-4">
            {failure.violations.map((violation) => (
              <li key={violationKey(violation)}>{violationText(violation)}</li>
            ))}
          </ul>
        </AlertDescription>
      ) : null}
    </Alert>
  );
};
