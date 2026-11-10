import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  AdAccountSchema,
  AdAuditPageSchema,
  AdCampaignReportSchema,
  AdInsightReportSchema,
  AdReportSchema,
  AdSpendingSchema,
  AdsModeSchema,
  AdNetworkSchema,
  BoostPageSchema,
  CalendarDaySchema,
  PostAdPerformanceSchema,
} from "peal-contract";
import type { AdAccount } from "peal-contract";

import { money } from "#ads-money.ts";
import { amountsIn, boostRow, totalsCells } from "#ads-print.ts";
import { apiErrorJson } from "#api-error.ts";
import { usesApiKey } from "#api-key.ts";
import { boost } from "#commands/ads-boosts.ts";
import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, count, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { channelNames, inWorkspace, named, workspaceFlag } from "#workspace.ts";

const AdsStatusSchema = Schema.Struct({
  mode: AdsModeSchema,
  networks: Schema.Array(AdNetworkSchema),
});

type AdsMode = typeof AdsModeSchema.Type;

/** What only a person does, in the web app: said wherever a command would need it. */
const personsOnly =
  "Signing in to an ad network, choosing the ad accounts it connects, and allowing one to spend, with its monthly ceiling, are a person's, in the web app, signed in themselves: no command, API key or application does them.";

const modes: Readonly<Record<AdsMode, string>> = {
  off: "Ads are off on this server: its operator turns them on (PEAL_ADS=read, or PEAL_ADS=spend). Nothing connects, and nothing spends.",
  read: "This server offers ads for reading: ad accounts connect, and their campaigns and numbers are read. Nothing spends: its operator has not turned spending on (PEAL_ADS=spend).",
  spend:
    "This server offers ads, spending included: ad accounts connect and are read, and a published post is boosted on an ad account an owner allowed to spend, within the monthly ceiling they set.",
};

const accountArgument = Argument.String("account-id").pipe(
  Argument.withDescription("The ad account, as peal ads accounts shows its id.")
);

const day = (name: string, description: string) =>
  Flag.String(name).pipe(
    Flag.withSchema(CalendarDaySchema),
    Flag.withMetavar("<YYYY-MM-DD>"),
    Flag.withDescription(description),
    Flag.optional
  );

const fromFlag = day(
  "from",
  "The first day, included, on the ad account's calendar. Defaults to the last 30 days."
);

const toFlag = day(
  "to",
  "The last day, included, on the ad account's calendar: 366 days after --from at most."
);

const cursorFlag = Flag.String("cursor").pipe(
  Flag.withMetavar("<cursor>"),
  Flag.withDescription("Where the page before ended, as it printed."),
  Flag.optional
);

// The days a report covers, as the query names them: only those given.
const daysOf = (from: Option.Option<string>, to: Option.Option<string>) => ({
  ...Option.match(from, {
    onNone: () => ({}),
    onSome: (first) => ({ from: first }),
  }),
  ...Option.match(to, {
    onNone: () => ({}),
    onSome: (last) => ({ to: last }),
  }),
});

const written = (account: AdAccount, amount: number): string =>
  money(amount, account.currency, account.minorUnitDigits);

// Whether an ad account may spend through Peal, and how much a month.
const spendingOf = (account: AdAccount): string =>
  account.spendingEnabled && account.monthlyCeiling !== null
    ? `spending on, ${written(account, account.monthlyCeiling)} a month at most`
    : "spending off";

const status = Command.make(
  "status",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("ads.status")(function* status({ json, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.ads
      .status({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(AdsStatusSchema, found);

      return;
    }

    yield* Console.log(modes[found.mode]);

    if (found.mode !== "off") {
      yield* Console.log(
        `Ad networks: ${found.networks.length === 0 ? "none is set up" : found.networks.join(", ")}.`
      );
      yield* Console.log(personsOnly);
    }
  })
).pipe(
  Command.withDescription(
    "Say what the server offers of ads: nothing, reading ad accounts, or boosting posts too."
  )
);

const accounts = Command.make(
  "accounts",
  { json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("ads.accounts")(function* accounts({ json, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.ads
      .listAccounts({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(Schema.Array(AdAccountSchema), found);

      return;
    }

    if (found.length === 0) {
      yield* Console.log(
        `${workspace.name} connects no ad account. ${personsOnly}`
      );

      return;
    }

    yield* Console.log(`Ad accounts of ${workspace.name}:`);

    for (const line of columns(
      found.map((account) => [
        `  ${account.id}`,
        account.name,
        account.network,
        account.currency,
        account.access === "working"
          ? account.status
          : `${account.status}, to reconnect`,
        spendingOf(account),
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's connected ad accounts: each one's network, currency and status, whether an owner allowed it to spend through Peal, and its monthly ceiling."
  )
);

const account = Command.make(
  "account",
  { accountId: accountArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("ads.account")(function* account({
    accountId,
    json,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.ads
      .getAccount({ params: { accountId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(AdSpendingSchema, found);

      return;
    }

    const { account: read, committedThisMonth } = found;

    yield* Console.log(`Ad account ${read.id} of ${workspace.name}:`);

    for (const line of columns([
      ["  Name", read.name],
      ["  Network", `${read.network}, where its id is ${read.externalId}`],
      ["  Currency", read.currency],
      ["  Time zone", read.timeZone],
      ["  Status", read.status],
      [
        "  Reading",
        read.access === "working"
          ? "works"
          : "the ad network refused its sign-in: its person signs in again, in the web app",
      ],
      [
        "  Spending",
        read.spendingEnabled && read.monthlyCeiling !== null
          ? `on: its boosts made through Peal may commit ${written(read, read.monthlyCeiling)} in a calendar month of its time zone`
          : "off: an owner turns it on, with a monthly ceiling, in the web app",
      ],
      [
        "  Committed this month",
        `${written(read, committedThisMonth)}, by the boosts made through Peal`,
      ],
      [
        "  Its own cap",
        read.spendCap === null
          ? "none set at the ad network"
          : `${written(read, read.spendCap)} at the ad network${read.amountSpent === null ? "" : `, ${written(read, read.amountSpent)} spent against it`}`,
      ],
      [
        "  Last read",
        read.syncedAt === null ? "not yet" : instant(read.syncedAt),
      ],
    ])) {
      yield* Console.log(line);
    }

    yield* Console.log(
      "The ceiling counts the boosts made through Peal alone, not what the ad account spends elsewhere; the ad network charges the account's payment method, never Peal."
    );
  })
).pipe(
  Command.withDescription(
    "Show one ad account: whether it may spend through Peal, its monthly ceiling, and what its boosts already commit this month."
  )
);

const campaigns = Command.make(
  "campaigns",
  {
    accountId: accountArgument,
    from: fromFlag,
    json: jsonFlag,
    to: toFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("ads.campaigns")(function* campaigns(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const report = yield* client.ads
      .listCampaigns({
        params: { accountId: input.accountId, workspaceId: workspace.id },
        query: daysOf(input.from, input.to),
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(AdCampaignReportSchema, report);

      return;
    }

    if (report.rows.length === 0) {
      yield* Console.log(
        `Peal has read no campaign of ${report.account.name} yet: it reads them every hour.`
      );

      return;
    }

    yield* Console.log(
      `Campaigns of ${report.account.name}, with what their ads did from ${report.from} to ${report.to}:`
    );

    for (const line of columns(
      report.rows.map((campaign) => [
        `  ${campaign.externalId}`,
        campaign.name,
        campaign.status,
        campaign.objective,
        ...totalsCells(campaign.totals, report.account),
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List an ad account's campaigns as Peal last read them from the ad network, those made elsewhere included, with what their ads did over a range of days."
  )
);

const list = Command.make(
  "list",
  {
    accountId: accountArgument,
    campaign: Flag.String("campaign").pipe(
      Flag.withMetavar("<campaign-id>"),
      Flag.withDescription(
        "Only the ads of this campaign, by the id the ad network gives it, as peal ads campaigns shows it."
      ),
      Flag.optional
    ),
    from: fromFlag,
    json: jsonFlag,
    to: toFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("ads.list")(function* list(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const report = yield* client.ads
      .listAds({
        params: { accountId: input.accountId, workspaceId: workspace.id },
        query: {
          ...daysOf(input.from, input.to),
          ...Option.match(input.campaign, {
            onNone: () => ({}),
            onSome: (campaignId) => ({ campaignId }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(AdReportSchema, report);

      return;
    }

    if (report.rows.length === 0) {
      yield* Console.log(
        `Peal has read no such ad of ${report.account.name}: it reads them every hour.`
      );

      return;
    }

    yield* Console.log(
      `Ads of ${report.account.name}, with what each did from ${report.from} to ${report.to}:`
    );

    for (const line of columns(
      report.rows.map((ad) => [
        `  ${ad.externalId}`,
        ad.name,
        ad.status,
        `campaign ${ad.campaignExternalId}`,
        ad.postId === null ? "no post of the workspace" : `post ${ad.postId}`,
        ...totalsCells(ad.totals, report.account),
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List an ad account's ads as Peal last read them, those of one campaign with --campaign: each with the workspace's post it promotes, when it is one, and what it did over a range of days."
  )
);

const insights = Command.make(
  "insights",
  {
    accountId: accountArgument,
    from: fromFlag,
    json: jsonFlag,
    to: toFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("ads.insights")(function* insights(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const report = yield* client.ads
      .listInsights({
        params: { accountId: input.accountId, workspaceId: workspace.id },
        query: daysOf(input.from, input.to),
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(AdInsightReportSchema, report);

      return;
    }

    if (report.rows.length === 0) {
      yield* Console.log(
        `The ads of ${report.account.name} did nothing Peal has read from ${report.from} to ${report.to}.`
      );

      return;
    }

    yield* Console.log(
      `What the ads of ${report.account.name} did each day, from ${report.from} to ${report.to}:`
    );

    for (const line of columns(
      report.rows.map(({ day: date, totals }) => [
        `  ${date}`,
        ...totalsCells(totals, report.account),
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "Sum what an ad account's ads did each day over a range of days: spend, impressions, reach, clicks and results."
  )
);

const post = Command.make(
  "post",
  {
    json: jsonFlag,
    postId: Argument.String("post-id").pipe(
      Argument.withDescription(
        "The published post, as peal posts list shows its id."
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("ads.post")(function* post({ json, postId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.ads
      .postPerformance({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(PostAdPerformanceSchema, found);

      return;
    }

    const names = yield* channelNames(client, workspace.id);
    const amounts = yield* amountsIn(client, workspace.id);

    yield* Console.log(
      `Post ${postId}, organic and paid side by side. Paid numbers are part of what a platform counts on the post: never add the two.`
    );

    yield* Console.log(
      found.organic.length === 0
        ? "Organic: no counts, or none you may read."
        : "Organic, by channel:"
    );

    for (const line of columns(
      found.organic.map((counts) => [
        `  ${named(names, counts.channelId)}`,
        `${count(counts.likes)} likes`,
        `${count(counts.reposts)} reposts`,
        `${count(counts.replies)} replies`,
        `${count(counts.impressions)} impressions`,
        counts.readAt === null
          ? "not read yet"
          : `read ${instant(counts.readAt)}`,
      ])
    )) {
      yield* Console.log(line);
    }

    yield* Console.log(
      found.paid.length === 0
        ? "Paid: no ad promotes it."
        : "Paid, by ad account:"
    );

    for (const line of columns(
      found.paid.map((paid) => [
        `  ${paid.account.name}`,
        `${String(paid.ads)} ${paid.ads === 1 ? "ad" : "ads"}`,
        ...totalsCells(paid.totals, paid.account),
      ])
    )) {
      yield* Console.log(line);
    }

    if (found.boosts.length > 0) {
      yield* Console.log("Boosts:");

      for (const line of columns(
        found.boosts.map((made) => boostRow(made, amounts))
      )) {
        yield* Console.log(line);
      }
    }
  })
).pipe(
  Command.withDescription(
    "Show a published post's organic counts on each channel beside what the ads that promote it did, by ad account, and its boosts: side by side, never summed."
  )
);

const boosts = Command.make(
  "boosts",
  {
    cursor: cursorFlag,
    json: jsonFlag,
    post: Flag.String("post").pipe(
      Flag.withMetavar("<post-id>"),
      Flag.withDescription("Only the boosts of this post."),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("ads.boosts")(function* boosts(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const page = yield* client.ads
      .listBoosts({
        params: { workspaceId: workspace.id },
        query: {
          ...Option.match(input.cursor, {
            onNone: () => ({}),
            onSome: (cursor) => ({ cursor }),
          }),
          ...Option.match(input.post, {
            onNone: () => ({}),
            onSome: (postId) => ({ postId }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(BoostPageSchema, page);

      return;
    }

    if (page.boosts.length === 0) {
      yield* Console.log(
        Option.match(input.post, {
          onNone: () => `${workspace.name} has no boost.`,
          onSome: (postId) => `Post ${postId} has no boost.`,
        })
      );

      return;
    }

    const amounts = yield* amountsIn(client, workspace.id);

    yield* Console.log(`Boosts of ${workspace.name}, newest first:`);

    for (const line of columns(
      page.boosts.map((made) => boostRow(made, amounts))
    )) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: peal ads boosts --workspace ${workspace.slug} --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's boosts, newest first, those of one post with --post: each one's state, budget and end."
  )
);

const audit = Command.make(
  "audit",
  { cursor: cursorFlag, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("ads.audit")(function* audit({ cursor, json, workspace: choice }) {
    const withKey = yield* usesApiKey;
    const { client, url, workspace } = yield* inWorkspace(choice);

    const page = yield* client.ads
      .auditTrail({
        params: { workspaceId: workspace.id },
        query: Option.match(cursor, {
          onNone: () => ({}),
          onSome: (after) => ({ cursor: after }),
        }),
      })
      .pipe(
        Effect.mapError((failure) =>
          // The server tells a sign-in its role lacks the permission, which
          // no application is ever given, whatever its user's role.
          !withKey &&
          failure._tag === "Forbidden" &&
          failure.permission === "ads:authorize"
            ? new Refused({
                error: apiErrorJson(failure),
                reason:
                  "The ads audit trail answers to the workspace's owners alone, and no application is ever given the permission it takes (ads:authorize), this command line's sign-in included: an owner reads it in the web app, signed in themselves.",
                requestId: failure.requestId,
              })
            : explain(url)(failure)
        )
      );

    if (json) {
      yield* printJson(AdAuditPageSchema, page);

      return;
    }

    if (page.entries.length === 0) {
      yield* Console.log(`The ads audit trail of ${workspace.name} is empty.`);

      return;
    }

    const amounts = yield* amountsIn(client, workspace.id);

    yield* Console.log(
      `The ads audit trail of ${workspace.name}, newest first:`
    );

    for (const line of columns(
      page.entries.map((entry) => [
        `  ${instant(entry.at)}`,
        entry.action,
        entry.by === null
          ? "by Peal"
          : `by ${entry.by.kind === "apiKey" ? "API key" : "member"} ${entry.by.id}${entry.by.viaClient === null ? "" : ` through ${entry.by.viaClient}`}`,
        entry.accountId === null ? "" : `account ${entry.accountId}`,
        entry.boostId === null ? "" : `boost ${entry.boostId}`,
        Object.entries(entry.amounts)
          .map(
            ([name, amount]) =>
              `${name} ${
                entry.accountId === null || entry.currency === null
                  ? String(amount)
                  : amounts(entry.accountId, amount, entry.currency)
              }`
          )
          .join(", "),
      ])
    )) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: peal ads audit --workspace ${workspace.slug} --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List the ads audit trail, newest first: every decision about spending and every change to a boost, with who made it and the amounts. It answers to the workspace's owners alone."
  )
);

export const ads = Command.make("ads").pipe(
  Command.withDescription(
    `A workspace's ad accounts, what their campaigns and ads did, and its boosts: a published post promoted as an ad, which spends money from the ad account's payment method. ${personsOnly}`
  ),
  Command.withSubcommands([
    status,
    accounts,
    account,
    campaigns,
    list,
    insights,
    post,
    boosts,
    boost,
    audit,
  ])
);
