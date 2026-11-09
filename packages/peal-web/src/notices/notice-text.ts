import { DateTime, Match } from "effect";
import { useTranslations } from "next-intl";
import type { NoticeChannel, NoticeEvent } from "peal-contract";

/** What a notice says, and where the reader acts on it. */
export interface NoticeText {
  /** The page the notice links to, under the locale's prefix. */
  readonly href: string;
  /** What the link says. */
  readonly open: string;
  readonly text: string;
}

/**
 * Writes notices in the reader's language, from the event they hold. The
 * workspace is named as `workspaces` has it, the user's own list; one they
 * left since is named as such.
 */
export const useNoticeText = (workspaces: ReadonlyMap<string, string>) => {
  const t = useTranslations("Notices");

  const channelName = (channel: NoticeChannel | null) =>
    channel === null
      ? t("unknownChannel")
      : t("channel", {
          handle: channel.handle,
          platform: t("platform", { platform: channel.platform }),
        });

  return (event: NoticeEvent, workspaceId: string): NoticeText => {
    const workspace = workspaces.get(workspaceId) ?? t("unknownWorkspace");
    const channel = channelName(event.channel);

    const post = (postId: string, text: string): NoticeText => ({
      href: `/app/${workspaceId}/posts/${postId}`,
      open: t("open", { page: "post" }),
      text,
    });

    const channels = (text: string): NoticeText => ({
      href: `/app/${workspaceId}/channels`,
      open: t("open", { page: "channels" }),
      text,
    });

    return Match.valueTags(event, {
      ChannelReconnectRequired: () =>
        channels(t("event.ChannelReconnectRequired", { channel, workspace })),
      ChannelReconnectSoon: ({ expiresAt }) =>
        channels(
          t("event.ChannelReconnectSoon", {
            channel,
            expiresAt: DateTime.toDate(expiresAt),
            workspace,
          })
        ),
      PostFailed: ({ postId, reason }) =>
        post(
          postId,
          t("event.PostFailed", {
            channel,
            reason: t("reason", { reason }),
            workspace,
          })
        ),
      PostPublished: ({ postId }) =>
        post(postId, t("event.PostPublished", { channel, workspace })),
      PostUnconfirmed: ({ postId }) =>
        post(postId, t("event.PostUnconfirmed", { channel, workspace })),
    });
  };
};
