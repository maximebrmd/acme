import { Match, Option } from "effect";

import type { Locale } from "#shared/domain/locale.ts";

import type { EmailCatalog, EmailMessages } from "./email-catalog.ts";
import {
  catalogs,
  escapeHtml,
  fill,
  instantIn,
  keep,
  layout,
  moneyIn,
} from "./email-layout.ts";
import type { RenderedEmail } from "./email-layout.ts";
import type {
  NoticeChannel,
  NoticeEvent,
  NoticeExcess,
  NoticeRates,
} from "./notice-event.ts";

/** A notice for one reader, as an email. */
export interface NoticeEmail {
  readonly event: NoticeEvent;
  readonly locale: Locale;
  /** The page the email links to, in the reader's language. */
  readonly url: string;
  readonly workspaceName: string;
}

const platformName = (catalog: EmailCatalog, channel: NoticeChannel) =>
  catalog.platforms[channel.platform] ?? channel.platform;

// The account, by its platform and handle, or as a disconnected channel.
const channelPhrase = (
  catalog: EmailCatalog,
  channel: Option.Option<NoticeChannel>
): string =>
  Option.match(channel, {
    onNone: () => catalog.unknownChannel,
    onSome: (known) =>
      fill(
        catalog.channel,
        new Map([
          ["handle", known.handle],
          ["platform", platformName(catalog, known)],
        ]),
        keep
      ),
  });

const gigabyte = 1_000_000_000;

// Bytes in the decimal units the plans are sold in, as the reader writes
// numbers.
const sizeIn = (bytes: number, locale: Locale): string =>
  bytes >= gigabyte
    ? new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
        style: "unit",
        unit: "gigabyte",
      }).format(bytes / gigabyte)
    : new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
        style: "unit",
        unit: "megabyte",
      }).format(bytes / 1_000_000);

// What a workspace holds beyond the free plan, each against what the plan
// allows, or that it holds nothing beyond it.
const standingIn = (
  catalog: EmailCatalog,
  over: readonly NoticeExcess[],
  locale: Locale
): string => {
  if (over.length === 0) {
    return catalog.withinFreePlan;
  }

  const amount = (limit: NoticeExcess["limit"], count: number) =>
    limit === "mediaStorage" ? sizeIn(count, locale) : String(count);

  const listed = over.map(({ allowed, limit, used }) =>
    fill(
      catalog.excess[limit],
      new Map([
        ["allowed", amount(limit, allowed)],
        ["used", amount(limit, used)],
      ]),
      keep
    )
  );

  return fill(
    catalog.overFreePlan,
    new Map([["over", listed.join(", ")]]),
    keep
  );
};

// Per-account pricing's ladder, a part a band, in the reader's words.
const ratesIn = (
  catalog: EmailCatalog,
  { bands, currency, freeAccounts }: NoticeRates,
  locale: Locale
): string => {
  const parts: string[] = [];
  let from = 1;

  for (const { monthly, upTo } of bands) {
    if (monthly === 0 && upTo !== null) {
      parts.push(
        fill(
          catalog.rates.free,
          new Map([["count", String(freeAccounts)]]),
          keep
        )
      );
    } else {
      const price = moneyIn({ amount: monthly, currency }, locale);

      parts.push(
        upTo === null
          ? fill(
              catalog.rates.lastBand,
              new Map([
                ["from", String(from)],
                ["price", price],
              ]),
              keep
            )
          : fill(
              catalog.rates.band,
              new Map([
                ["from", String(from)],
                ["price", price],
                ["to", String(upTo)],
              ]),
              keep
            )
      );
    }

    from = (upTo ?? from) + 1;
  }

  return parts.join(", ");
};

// The body, with what the contract's number is for once it has one.
const numbered = (
  messages: EmailMessages,
  catalog: EmailCatalog,
  reference: string | undefined
): EmailMessages =>
  reference === undefined
    ? messages
    : { ...messages, body: `${messages.body} ${catalog.contractNumber}` };

interface Content {
  /** What the email sets apart in a box, if anything. */
  readonly highlight?: string;
  readonly messages: EmailMessages;
  readonly values: readonly (readonly [string, string])[];
}

const contentOf = (
  event: NoticeEvent,
  catalog: EmailCatalog,
  locale: Locale
): Content =>
  Match.valueTags(event, {
    AdBoostChanged: ({
      budget,
      budgetDigits,
      change,
      endsAt,
      reason,
    }): Content => ({
      messages: {
        budgetReached: catalog.adBoostBudgetReached,
        ended: catalog.adBoostEnded,
        failed: catalog.adBoostFailed,
        started: catalog.adBoostStarted,
        unconfirmed: catalog.adBoostUnconfirmed,
      }[change],
      values: [
        [
          "budget",
          // An ad account's amounts are in its own minor units, which are
          // whole units for some currencies: brought to hundredths here.
          moneyIn(
            {
              amount: budgetDigits === 0 ? budget.amount * 100 : budget.amount,
              currency: budget.currency,
            },
            locale
          ),
        ],
        ["endsAt", instantIn(endsAt, locale)],
        [
          "reason",
          reason.pipe(
            Option.flatMapNullishOr(
              (name) => catalog.adBoostFailureReasons[name]
            ),
            Option.getOrElse(() => catalog.adBoostFailureOther)
          ),
        ],
      ],
    }),
    AdConnectionReconnectRequired: (): Content => ({
      messages: catalog.adConnectionReconnect,
      values: [],
    }),
    ChannelReconnectRequired: ({ channel }): Content => ({
      messages: catalog.channelReconnectRequired,
      values: [
        ["handle", channel.handle],
        ["platform", platformName(catalog, channel)],
      ],
    }),
    ChannelReconnectSoon: ({ channel, expiresAt }): Content => ({
      messages: catalog.channelReconnectSoon,
      values: [
        ["expiresAt", instantIn(expiresAt, locale)],
        ["handle", channel.handle],
        ["platform", platformName(catalog, channel)],
      ],
    }),
    CommentsReceived: ({ count }): Content => ({
      messages: catalog.commentsReceived,
      values: [["count", String(count)]],
    }),
    MessagesReceived: ({ channel, count }): Content => ({
      messages: catalog.messagesReceived,
      values: [
        ["count", String(count)],
        ["handle", channel.handle],
        ["platform", platformName(catalog, channel)],
      ],
    }),
    MessagesTurnedOff: ({ channel }): Content => ({
      messages: catalog.messagesTurnedOff,
      values: [
        ["handle", channel.handle],
        ["platform", platformName(catalog, channel)],
      ],
    }),
    FeedStopped: ({ reason }): Content => ({
      messages: catalog.feedStopped,
      values: [["reason", catalog.feedStopReasons[reason]]],
    }),
    FollowUpsNotSent: ({ count, reasons }): Content => ({
      messages: catalog.followUpsNotSent,
      values: [
        ["count", String(count)],
        [
          "reasons",
          reasons
            .map((reason) => catalog.followUpNotSentReasons[reason])
            .join(catalog.reasonsJoint),
        ],
      ],
    }),
    FollowUpRuleStopped: ({ reason }): Content => ({
      messages: catalog.followUpRuleStopped,
      values: [["reason", catalog.followUpRuleStopReasons[reason]]],
    }),
    CommentRuleStopped: ({ reason }): Content => ({
      messages: catalog.commentRuleStopped,
      values: [["reason", catalog.commentRuleStopReasons[reason]]],
    }),
    PostApprovalRequested: ({ scheduledAt }): Content => ({
      messages: catalog.postApprovalRequested,
      values: [["scheduledAt", instantIn(scheduledAt, locale)]],
    }),
    PostApproved: ({ by, late }): Content => ({
      messages: late ? catalog.postApprovedLate : catalog.postApproved,
      values: [["by", catalog.reviewParties[by]]],
    }),
    PostChangesRequested: ({ by }): Content => ({
      messages: catalog.postChangesRequested,
      values: [["by", catalog.reviewParties[by]]],
    }),
    PostCommented: ({ by }): Content => ({
      messages: catalog.postCommented,
      values: [["by", catalog.reviewParties[by]]],
    }),
    PostFailed: ({ channel, notSent, reason }): Content => ({
      messages: {
        firstComment: catalog.firstCommentFailed,
        laterParts: catalog.laterPartsFailed,
        none: catalog.postFailed,
      }[notSent ?? "none"],
      values: [
        ["channel", channelPhrase(catalog, channel)],
        ["reason", catalog.failureReasons[reason]],
      ],
    }),
    PostPublished: ({ channel }): Content => ({
      messages: catalog.postPublished,
      values: [["channel", channelPhrase(catalog, channel)]],
    }),
    PostUnconfirmed: ({ channel }): Content => ({
      messages: catalog.postUnconfirmed,
      values: [["channel", channelPhrase(catalog, channel)]],
    }),
    RecyclingEnded: ({ reason }): Content => ({
      messages: catalog.recyclingEnded,
      values: [["reason", catalog.recyclingEndReasons[reason]]],
    }),
    SubscriptionCancelled: ({ endsAt, plan }): Content => ({
      messages: catalog.subscriptionCancelled,
      values: [
        ["endsAt", instantIn(endsAt, locale)],
        ["plan", catalog.plans[plan]],
      ],
    }),
    SubscriptionRenewing: ({ plan, price, reference, renewsAt }): Content => ({
      highlight: catalog.renewalDeadline,
      messages: numbered(catalog.subscriptionRenewing, catalog, reference),
      values: [
        ["plan", catalog.plans[plan]],
        ["price", moneyIn(price, locale)],
        ["reference", reference ?? ""],
        ["renewsAt", instantIn(renewsAt, locale)],
      ],
    }),
    SubscriptionStarted: ({
      interval,
      plan,
      price,
      rates,
      reference,
      startedAt,
      trialEnd,
    }): Content =>
      rates === undefined
        ? Option.match(trialEnd, {
            onNone: (): Content => ({
              messages: numbered(
                catalog.subscriptionStarted,
                catalog,
                reference
              ),
              values: [
                ["reference", reference ?? ""],
                ["interval", catalog.intervals[interval]],
                ["plan", catalog.plans[plan]],
                ["price", moneyIn(price, locale)],
                ["startedAt", instantIn(startedAt, locale)],
              ],
            }),
            onSome: (endsAt): Content => ({
              messages: numbered(catalog.trialStarted, catalog, reference),
              values: [
                ["reference", reference ?? ""],
                ["endsAt", instantIn(endsAt, locale)],
                ["plan", catalog.plans[plan]],
                ["price", moneyIn(price, locale)],
                ["startedAt", instantIn(startedAt, locale)],
              ],
            }),
          })
        : {
            messages: numbered(catalog.perAccountStarted, catalog, reference),
            values: [
              ["reference", reference ?? ""],
              ["rates", ratesIn(catalog, rates, locale)],
              ["startedAt", instantIn(startedAt, locale)],
            ],
          },
    PaymentMethodNeeded: ({ accounts, allowed, graceUntil }): Content => ({
      messages: catalog.paymentMethodNeeded,
      values: [
        ["accounts", String(accounts)],
        ["allowed", String(allowed)],
        ["graceUntil", instantIn(graceUntil, locale)],
      ],
    }),
    PlansRetiring: ({ endsAt, plan }): Content => ({
      messages: catalog.plansRetiring,
      values: [
        ["endsAt", instantIn(endsAt, locale)],
        ["plan", catalog.plans[plan]],
      ],
    }),
    AllowanceReached: ({ allowed, meter, resetsAt }): Content => ({
      messages: catalog.allowanceReached,
      values: [
        ["allowed", new Intl.NumberFormat(locale).format(allowed)],
        ["meter", catalog.meters[meter]],
        ["resetsAt", instantIn(resetsAt, locale)],
      ],
    }),
    XSpendCeiling: ({ ceiling, percent, resetsAt }): Content => ({
      messages:
        percent >= 100 ? catalog.xCeilingReached : catalog.xCeilingNearing,
      values: [
        ["ceiling", moneyIn({ amount: ceiling, currency: "usd" }, locale)],
        ["percent", String(percent)],
        ["resetsAt", instantIn(resetsAt, locale)],
      ],
    }),
    SubscriptionWithdrawn: ({ plan, refunded, withdrawnAt }): Content => ({
      messages: catalog.subscriptionWithdrawn,
      values: [
        ["plan", catalog.plans[plan]],
        ["refunded", moneyIn(refunded, locale)],
        ["withdrawnAt", instantIn(withdrawnAt, locale)],
      ],
    }),
    TrialEnding: ({ endsAt, over, plan }): Content => ({
      messages: catalog.trialEnding,
      values: [
        ["endsAt", instantIn(endsAt, locale)],
        ["plan", catalog.plans[plan]],
        ["standing", standingIn(catalog, over, locale)],
      ],
    }),
    WebhookDeliveriesFailing: ({ host }): Content => ({
      messages: catalog.webhookDeliveriesFailing,
      values: [["host", host]],
    }),
    WebhookEndpointDisabled: ({ host, reason }): Content => ({
      messages: catalog.webhookEndpointDisabled,
      values: [
        ["host", host],
        ["reason", catalog.webhookTurnOffReasons[reason]],
      ],
    }),
  });

/** A notice, in its reader's language. */
export const renderNoticeEmail = (email: NoticeEmail): RenderedEmail => {
  const catalog = catalogs[email.locale];

  const {
    highlight,
    messages,
    values: own,
  } = contentOf(email.event, catalog, email.locale);

  const values: ReadonlyMap<string, string> = new Map([
    ...own,
    ["workspaceName", email.workspaceName],
  ]);

  const inHtml = (template: string) => fill(template, values, escapeHtml);
  const inText = (template: string) => fill(template, values, keep);

  const parts = {
    action: inHtml(messages.action),
    body: inHtml(messages.body),
    ignore: inHtml(messages.ignore),
    linkFallback: escapeHtml(catalog.layout.linkFallback),
    locale: email.locale,
    signature: escapeHtml(catalog.layout.signature),
    url: escapeHtml(email.url),
  };

  return {
    html: layout(
      highlight === undefined
        ? parts
        : { ...parts, highlight: inHtml(highlight) }
    ),
    subject: inText(messages.subject),
    text: [
      inText(messages.body),
      ...(highlight === undefined ? [] : [inText(highlight)]),
      fill(
        catalog.layout.textLink,
        new Map([
          ["action", inText(messages.action)],
          ["url", email.url],
        ]),
        keep
      ),
      inText(messages.ignore),
      catalog.layout.signature,
    ].join("\n\n"),
  };
};
