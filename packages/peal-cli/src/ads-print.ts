import { Effect } from "effect";
import {
  dailyOverspendPercent,
  maxBoostAge,
  weeklySpendLimitDays,
} from "peal-contract";
import type {
  AdAccount,
  Boost,
  BoostFailureReason,
  BoostState,
  PaidTotals,
} from "peal-contract";

import { money } from "#ads-money.ts";
import { columns, count, instant } from "#print.ts";
import type { signedIn } from "#workspace.ts";

type SignedInClient = Effect.Success<typeof signedIn>["client"];

/** How a boost's budget is spent: over its whole run, or each day of it. */
export type BoostBudget = Boost["budget"];

/** Who a boost is shown to. */
export type BoostAudience = Boost["audience"];

// Where a boost stands, as its reader acts on it. Every state has its
// words, so a new one fails to compile until it has some.
const boostStates: Readonly<Record<BoostState, string>> = {
  active: "it runs, and spends, until its end",
  ended: "its end date passed, and it spends nothing more",
  failed: "it could not be made, and nothing ran or was spent",
  paused:
    "it spends nothing while paused, and its budget stays counted against the ceiling",
  requested:
    "it was accepted and is being made in the background, paused first: it spends nothing yet",
  stopped: "it was stopped for good, and never runs again",
  unconfirmed:
    "Peal told the ad network to run it and could not read back whether it does: it MAY BE SPENDING, its budget stays counted, and peal ads boost stop settles it",
};

// Why a boost failed, with nothing spent, and what would let the next one
// through. Every reason has its sentence, as every state has.
const boostFailures: Readonly<Record<BoostFailureReason, string>> = {
  accountSpendCap:
    "the ad account's own spend cap, set at its ad network, left too little room",
  accountUnusable:
    "the ad account cannot run ads now: that is settled at its ad network",
  budgetTooLow:
    "the budget is under the ad network's minimum: ask for a larger one",
  ceilingExceeded:
    "the monthly ceiling was lowered meanwhile, and no longer has room: an owner raises it in the web app",
  currencyMismatch: "the budget's currency is not the ad account's",
  networkUnavailable:
    "the ad network kept refusing for now: boost the post again later",
  permissionMissing:
    "the ad account's sign-in lacks a permission: its person signs in again, in the web app, and allows it",
  postNotPromotable: "the post was deleted, or cannot be shown as an ad",
  reconnectNeeded:
    "the ad network refused the ad account's sign-in: its person signs in again, in the web app",
  refused: "the ad network refused it, for a reason of its own",
  spendingOff:
    "spending was turned off on the ad account meanwhile: an owner turns it on in the web app",
  spendingUnavailable: "the server no longer offers spending",
};

/** A boost's state in a word, with why when it failed. */
export const stateOf = (boost: Boost): string => {
  if (boost.state !== "failed" || boost.failureReason === null) {
    return boost.state;
  }

  return boost.networkCode === null
    ? `failed: ${boost.failureReason}`
    : `failed: ${boost.failureReason} (${boost.networkCode})`;
};

/** What a boost's state means, in a sentence. */
export const standingOf = (boost: Boost): string => {
  const why =
    boost.state === "failed" && boost.failureReason !== null
      ? ` Why: ${boostFailures[boost.failureReason]}${boost.networkCode === null ? "" : ` (the network's code: ${boost.networkCode})`}.`
      : "";

  return `Boost ${boost.id} is ${boost.state}: ${boostStates[boost.state]}.${why}`;
};

/**
 * How amounts of each ad account are written: in the account's units when
 * the workspace still connects it, and as the API counts them otherwise.
 */
export type Amounts = (
  accountId: string,
  amount: number,
  currency: string
) => string;

const amountsOf =
  (accounts: readonly AdAccount[]): Amounts =>
  (accountId, amount, currency) => {
    const account = accounts.find(({ id }) => id === accountId);

    return account === undefined
      ? `${String(amount)} ${currency} (in minor units)`
      : money(amount, currency, account.minorUnitDigits);
  };

/**
 * The workspace's ad accounts, to write amounts with. A member who may not
 * list them reads amounts as the API counts them.
 */
export const amountsIn = (client: SignedInClient, workspaceId: string) =>
  client.ads.listAccounts({ params: { workspaceId } }).pipe(
    Effect.orElseSucceed((): readonly AdAccount[] => []),
    Effect.map(amountsOf)
  );

/** A budget as people read it: for the whole run, or for each day. */
export const budgetOf = (budget: BoostBudget, amount: string): string =>
  budget.kind === "total"
    ? `${amount} for the whole run`
    : `${amount} a day, up to ${String(dailyOverspendPercent)}% more on any one day and ${String(weeklySpendLimitDays)} times it in a week`;

const age = (years: number): string =>
  years === maxBoostAge ? `${String(years)} and over` : String(years);

/** An audience as people read it. */
export const audienceOf = ({
  ageMax,
  ageMin,
  countries,
}: BoostAudience): string =>
  `people aged ${String(ageMin)} to ${age(ageMax)}, in ${countries.join(", ")}`;

/** A boost, a line per thing known of it. */
export const boostLines = (boost: Boost, amounts: Amounts): string[] => {
  const written = (amount: number) =>
    amounts(boost.accountId, amount, boost.currency);

  return columns([
    [
      "  Post",
      `${boost.postId}, on ${boost.platform} (channel ${boost.channelId})`,
    ],
    ["  Ad account", boost.accountId],
    ["  Budget", budgetOf(boost.budget, written(boost.budget.amount))],
    [
      "  Most it can cost",
      `${written(boost.committed)}, counted against the monthly ceiling`,
    ],
    ["  Starts", instant(boost.startsAt)],
    ["  Ends", instant(boost.endsAt)],
    ["  Audience", audienceOf(boost.audience)],
    ...(boost.beneficiary === null ? [] : [["  Benefits", boost.beneficiary]]),
    ...(boost.payer === null ? [] : [["  Paid by", boost.payer]]),
    ["  Asked", instant(boost.createdAt)],
    ["  In this state since", instant(boost.stateAt)],
  ]);
};

/** A boost as one row of a list. */
export const boostRow = (boost: Boost, amounts: Amounts): string[] => [
  `  ${boost.id}`,
  stateOf(boost),
  `post ${boost.postId}`,
  budgetOf(
    boost.budget,
    amounts(boost.accountId, boost.budget.amount, boost.currency)
  ),
  `ends ${instant(boost.endsAt)}`,
];

/** What some ads did, as cells: spend, then the counts. */
export const totalsCells = (
  totals: PaidTotals,
  account: AdAccount
): string[] => [
  `${money(totals.spend, account.currency, account.minorUnitDigits)} spent`,
  `${String(totals.impressions)} impressions`,
  `${String(totals.reach)} reach`,
  `${String(totals.clicks)} clicks`,
  `${count(totals.results)} results`,
];
