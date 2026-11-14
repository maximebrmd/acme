import { DateTime, Match } from "effect";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { webhookFailingDays } from "peal-contract";
import type { NoticeChannel, NoticeEvent } from "peal-contract";

import { formatMoney } from "#ads/money.ts";
import { useSize } from "#billing/size.ts";

/** What a notice says, and where the reader acts on it. */

// A failed post's notice, by what did not go out: the post, or only what
// followed it there.
const failedKeys = {
  firstComment: "event.FirstCommentFailed",
  laterParts: "event.LaterPartsFailed",
  none: "event.PostFailed",
} as const;

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
  const locale = useLocale();

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

    const webhooks = (text: string): NoticeText => ({
      href: `/app/${workspaceId}/settings/webhooks`,
      open: t("open", { page: "webhooks" }),
      text,
    });

    const inbox = (threadId: string, text: string): NoticeText => ({
      href: `/app/${workspaceId}/inbox/${threadId}`,
      open: t("open", { page: "inbox" }),
      text,
    });

    const ads = (text: string): NoticeText => ({
      href: `/app/${workspaceId}/ads`,
      open: t("open", { page: "ads" }),
      text,
    });

    const recycling = (ruleId: string, text: string): NoticeText => ({
      href: `/app/${workspaceId}/settings/recycling?rule=${ruleId}`,
      open: t("open", { page: "recycling" }),
      text,
    });

    const feed = (feedId: string, text: string): NoticeText => ({
      href: `/app/${workspaceId}/settings/feeds?feed=${feedId}`,
      open: t("open", { page: "feeds" }),
      text,
    });

    const plan = (name: string) => t("plan", { plan: name });

    return Match.valueTags(event, {
      AdBoostChanged: ({
        budget,
        budgetDigits,
        change,
        endsAt,
        postId,
        reason,
      }) =>
        post(
          postId,
          t("event.AdBoostChanged", {
            budget: formatMoney(
              locale,
              budget.amount,
              budget.currency.toUpperCase(),
              budgetDigits
            ),
            change,
            endsAt: DateTime.toDate(endsAt),
            reason: t("boostReason", { reason: reason ?? "refused" }),
            workspace,
          })
        ),
      AdConnectionReconnectRequired: ({ network }) =>
        ads(
          t("event.AdConnectionReconnectRequired", {
            network: t("adNetwork", { network }),
            workspace,
          })
        ),
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
      CommentsReceived: ({ count, threadId }) =>
        inbox(threadId, t("event.CommentsReceived", { count, workspace })),
      FeedStopped: ({ feedId, reason }) =>
        feed(feedId, t("event.FeedStopped", { reason, workspace })),
      MessagesReceived: ({ conversationId, count }) =>
        inbox(
          `messages/${conversationId}`,
          t("event.MessagesReceived", { channel, count, workspace })
        ),
      MessagesTurnedOff: () => ({
        href: `/app/${workspaceId}/inbox`,
        open: t("open", { page: "inbox" }),
        text: t("event.MessagesTurnedOff", { channel, workspace }),
      }),
      PostApprovalRequested: ({ postId, scheduledAt }) =>
        post(
          postId,
          t("event.PostApprovalRequested", {
            scheduledAt: DateTime.toDate(scheduledAt),
            workspace,
          })
        ),
      PostApproved: ({ by, late, postId }) =>
        post(
          postId,
          t(late ? "event.PostApprovedLate" : "event.PostApproved", {
            by,
            workspace,
          })
        ),
      PostChangesRequested: ({ by, postId }) =>
        post(postId, t("event.PostChangesRequested", { by, workspace })),
      PostCommented: ({ by, postId }) =>
        post(postId, t("event.PostCommented", { by, workspace })),
      PostFailed: ({ notSent, postId, reason }) =>
        post(
          postId,
          t(failedKeys[notSent ?? "none"], {
            channel,
            reason: t("reason", { reason }),
            workspace,
          })
        ),
      PostPublished: ({ postId }) =>
        post(postId, t("event.PostPublished", { channel, workspace })),
      PostUnconfirmed: ({ postId }) =>
        post(postId, t("event.PostUnconfirmed", { channel, workspace })),
      RecyclingEnded: ({ reason, ruleId }) =>
        recycling(ruleId, t("event.RecyclingEnded", { reason, workspace })),
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
      PaymentMethodNeeded: ({ accounts, allowed, graceUntil }) =>
        billing(
          t("event.PaymentMethodNeeded", {
            accounts,
            allowed,
            // The exact instant, in UTC: a day alone reads as included,
            // and shifts west of UTC.
            graceUntil: DateTime.format(graceUntil, {
              dateStyle: "long",
              locale,
              timeStyle: "short",
              timeZone: "UTC",
            }),
            workspace,
          })
        ),
      PlansRetiring: ({ endsAt, plan: name }) =>
        billing(
          t("event.PlansRetiring", {
            endsAt: DateTime.toDate(endsAt),
            plan: plan(name),
            workspace,
          })
        ),
      AllowanceReached: ({ allowed, meter, resetsAt }) =>
        billing(
          t("event.AllowanceReached", {
            allowed,
            meter,
            // The first of next month, in UTC.
            resetsAt: DateTime.format(resetsAt, {
              dateStyle: "long",
              locale,
              timeZone: "UTC",
            }),
            workspace,
          })
        ),
      XSpendCeiling: ({ ceiling, percent, resetsAt }) =>
        billing(
          t("event.XSpendCeiling", {
            ceiling: money(ceiling, "usd"),
            percent,
            // The first of next month, in UTC.
            resetsAt: DateTime.format(resetsAt, {
              dateStyle: "long",
              locale,
              timeZone: "UTC",
            }),
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
      WebhookDeliveriesFailing: ({ host }) =>
        webhooks(
          t("event.WebhookDeliveriesFailing", {
            days: webhookFailingDays,
            host,
            workspace,
          })
        ),
      WebhookEndpointDisabled: ({ host, reason }) =>
        webhooks(
          t("event.WebhookEndpointDisabled", {
            days: webhookFailingDays,
            host,
            reason,
            workspace,
          })
        ),
    });
  };
};
