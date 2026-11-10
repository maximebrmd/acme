import { DateTime, Match } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type { NoticeChannel, NoticeEvent } from "peal-contract";

import { useSize } from "#billing/size.ts";

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
  const format = useFormatter();
  const size = useSize();

  const channelName = (channel: NoticeChannel | null) =>
    channel === null
      ? t("unknownChannel")
      : t("channel", {
          handle: channel.handle,
          platform: t("platform", { platform: channel.platform }),
        });

  const money = (amount: number, currency: string) =>
    format.number(amount / 100, {
      currency: currency.toUpperCase(),
      style: "currency",
    });

  return (event: NoticeEvent, workspaceId: string): NoticeText => {
    const workspace = workspaces.get(workspaceId) ?? t("unknownWorkspace");
    const channel = "channel" in event ? channelName(event.channel) : "";

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

    const billing = (text: string): NoticeText => ({
      href: `/app/${workspaceId}/billing`,
      open: t("open", { page: "billing" }),
      text,
    });

    const plan = (name: string) => t("plan", { plan: name });

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
      SubscriptionCancelled: ({ endsAt, plan: name }) =>
        billing(
          t("event.SubscriptionCancelled", {
            endsAt: DateTime.toDate(endsAt),
            plan: plan(name),
            workspace,
          })
        ),
      SubscriptionRenewing: ({ plan: name, price, renewsAt }) =>
        billing(
          t("event.SubscriptionRenewing", {
            plan: plan(name),
            price: money(price.amount, price.currency),
            renewsAt: DateTime.toDate(renewsAt),
            workspace,
          })
        ),
      SubscriptionStarted: ({
        interval,
        plan: name,
        price,
        startedAt,
        trialEnd,
      }) =>
        billing(
          trialEnd === null
            ? t("event.SubscriptionStarted", {
                interval,
                plan: plan(name),
                price: money(price.amount, price.currency),
                startedAt: DateTime.toDate(startedAt),
                workspace,
              })
            : t("event.TrialStarted", {
                endsAt: DateTime.toDate(trialEnd),
                plan: plan(name),
                workspace,
              })
        ),
      SubscriptionWithdrawn: ({ plan: name, refunded, withdrawnAt }) =>
        billing(
          t("event.SubscriptionWithdrawn", {
            plan: plan(name),
            refunded: money(refunded.amount, refunded.currency),
            withdrawnAt: DateTime.toDate(withdrawnAt),
            workspace,
          })
        ),
      TrialEnding: ({ endsAt, over, plan: name }) =>
        billing(
          over.length === 0
            ? t("event.TrialEnding", {
                endsAt: DateTime.toDate(endsAt),
                plan: plan(name),
                workspace,
              })
            : t("event.TrialEndingOver", {
                endsAt: DateTime.toDate(endsAt),
                over: over
                  .map(({ allowed, limit, used }) =>
                    limit === "mediaStorage"
                      ? t("excessStorage", {
                          allowed: size(allowed),
                          used: size(used),
                        })
                      : t("excess", { allowed, limit, used })
                  )
                  .join(", "),
                plan: plan(name),
                workspace,
              })
        ),
    });
  };
};
