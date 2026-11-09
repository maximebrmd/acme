"use client";

import type { Channel, ContentViolation } from "acme-contract";
import { Alert, AlertDescription, AlertTitle } from "acme-ui/components/alert";
import { Match } from "effect";
import { useTranslations } from "next-intl";

import type { ComposerFailure } from "#posts/composer-failure.ts";

const violationKey = (violation: ContentViolation) =>
  violation._tag === "noChannels"
    ? violation._tag
    : `${violation._tag}-${violation.channelId}`;

interface ComposerErrorsProps {
  readonly channels: readonly Channel[];
  readonly failure: ComposerFailure | null;
}

// Why the last save or schedule failed, with each of the platforms' rules
// the content breaks, channel by channel.
export const ComposerErrors = ({ channels, failure }: ComposerErrorsProps) => {
  const t = useTranslations("Posts.Composer");
  const tPosts = useTranslations("Posts");

  if (failure === null) {
    return null;
  }

  const channelName = (channelId: string) => {
    const channel = channels.find(({ id }) => id === channelId);

    return channel === undefined
      ? channelId
      : t("channelDetail", {
          handle: channel.handle,
          platform: tPosts("platform", { platform: channel.platform }),
        });
  };

  const violationText = (violation: ContentViolation) =>
    Match.valueTags(violation, {
      empty: ({ channelId }) =>
        t("violation.empty", { channel: channelName(channelId) }),
      mediaRequired: ({ channelId }) =>
        t("violation.mediaRequired", { channel: channelName(channelId) }),
      noChannels: () => t("violation.noChannels"),
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
