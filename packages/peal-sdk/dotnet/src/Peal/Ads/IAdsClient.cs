namespace Peal;

public partial interface IAdsClient
{
    /// <summary>
    /// Says what this server offers of ads (`off`, `read` or `spend`) and on which networks. Needs ads:read.
    /// </summary>
    WithRawResponseTask<AdsStatus> StatusAsync(
        StatusAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the workspace's sign-ins to ad networks, oldest first: who signed in, whether the network still takes the sign-in, and whether it may run ads. Never a token. Needs ads:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<AdConnection>> ListConnectionsAsync(
        ListConnectionsAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Starts a sign-in to an ad network and answers the page to send the member's browser to. The sign-in asks for reading only on a server that offers no spending. Only a person does this, signed in to Peal in their own session, who manages ad accounts (ads:manage): never an API key, an application or staff acting as them.
    /// </summary>
    WithRawResponseTask<AdSignIn> ConnectAsync(
        ConnectAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Completes a sign-in with what the network's page sent back, and answers the ad accounts it reaches. Nothing is connected yet: `connectAccounts` connects those chosen. A sign-in is completed once, within 15 minutes, by who started it. Needs ads:manage, in person.
    /// </summary>
    WithRawResponseTask<AdSignInResult> CompleteConnectAsync(
        AdSignInCallback request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the ad accounts a sign-in reaches now, as the network gives them: currency, time zone, status and spend cap, and whether the workspace already connects each. Only who signed in reads it (ads:manage, in person).
    /// </summary>
    WithRawResponseTask<IEnumerable<ReachableAdAccount>> ReachableAccountsAsync(
        ReachableAccountsAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Connects some of the ad accounts a sign-in reaches, 25 at most, by the ids the network gives them. The network is asked again which accounts the sign-in reaches: one it does not reach is `AdAccountNotFound`, and nothing is connected. An account connected before stays as it is. Spending is off on every new account until an owner turns it on. Only who signed in does this (ads:manage, in person).
    /// </summary>
    WithRawResponseTask<IEnumerable<AdAccount>> ConnectAccountsAsync(
        AdAccountsToConnect request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Removes a sign-in, its token, the ad accounts it connects and what was read of them; their boosts' records stay with the workspace, and what they committed still counts once the same account is connected again. Refused while one of their boosts runs, may run, is paused or is being made (`AdAccountBusy`): stop them first. What runs at the network that Peal did not make is left as it is. Needs ads:manage.
    /// </summary>
    WithRawResponseTask DisconnectAsync(
        DisconnectAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the workspace's connected ad accounts, oldest first, with whether each may spend through Peal and its monthly ceiling. Needs ads:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<AdAccount>> ListAccountsAsync(
        ListAccountsAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Shows an ad account with what its boosts made through Peal commit in the current calendar month of its time zone. Needs ads:read.
    /// </summary>
    WithRawResponseTask<AdSpending> GetAccountAsync(
        GetAccountAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Disconnects an ad account: what was read of it goes with it, and its boosts' records stay with the workspace, so what they committed still counts against the ceiling once the same account is connected again. Refused while one of its boosts runs, may run, is paused or is being made (`AdAccountBusy`), as a paused campaign may run again. Needs ads:manage.
    /// </summary>
    WithRawResponseTask RemoveAccountAsync(
        RemoveAccountAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Decides whether an ad account may spend through Peal, and how much: `enabled` with a `monthlyCeiling` in the account's currency, the most its boosts may commit in one calendar month of its time zone. A ceiling may always be lowered, under running boosts too: they run on, and nothing new starts or resumes until there is room. Turning spending off is refused while a boost runs or may run (`AdAccountBusy`). Only an owner does this, signed in to Peal in their own session (ads:authorize): never an admin, an API key, an application or staff acting as an owner. Peal never turns spending on or raises a ceiling on its own.
    /// </summary>
    WithRawResponseTask<AdSpending> SetSpendingAsync(
        AdSpendingDecision request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists an ad account's campaigns as last read from its network (every hour), those made outside Peal included, with what their ads did over the days `from` to `to` of the account's calendar, both included and at most 366 days: the last 30 when left out. A thousand at most. Needs ads:read.
    /// </summary>
    WithRawResponseTask<AdCampaignReport> ListCampaignsAsync(
        ListCampaignsAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists an ad account's ads as last read, those of one campaign with `campaignId` (the network's id), each with the workspace's own post it promotes when it is one, and what it did over the days `from` to `to` of the account's calendar, both included and at most 366 days: the last 30 when left out. A thousand at most. Needs ads:read.
    /// </summary>
    WithRawResponseTask<AdReport> ListAdsAsync(
        ListAdsAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sums what an ad account's ads did each day: spend, impressions, reach, clicks and results, over the days `from` to `to` of the account's calendar, both included and at most 366 days: the last 30 when left out. A day is kept 396 days. Needs ads:read.
    /// </summary>
    WithRawResponseTask<AdInsightReport> ListInsightsAsync(
        ListInsightsAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Shows a published post's organic counts on each channel beside what the ads that promote it did, by ad account, and its boosts. Paid numbers are part of what a platform counts on the post: the two are shown side by side, never summed. The organic side is empty for someone who may not read analytics. Needs ads:read.
    /// </summary>
    WithRawResponseTask<PostAdPerformance> PostPerformanceAsync(
        PostPerformanceAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Checks a boost as `createBoost` would, and says what it would commit and the room it has, without reserving or sending anything: show it before the last step. A total budget commits its amount; a daily budget commits, for each calendar week of the account's zone (Sunday to Saturday) the run touches, its amount and 75% more for each day of the run in that week, which the network may spend on any day, and never more than 7 times its amount, the most the network spends in a week. Needs ads:spend.
    /// </summary>
    WithRawResponseTask<BoostQuote> QuoteBoostAsync(
        QuoteBoostAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the workspace's boosts, newest first, 50 a page, those of one post with `postId`. Pass the page's `nextCursor` as `cursor` for the next one. Needs ads:read.
    /// </summary>
    WithRawResponseTask<BoostPage> ListBoostsAsync(
        ListBoostsAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// **Spends money.** Boosts a post the workspace published on a Facebook Page, or on an Instagram account connected through its Page, as an ad on Meta: it spends up to the budget, from the ad account's payment method, until `endsAt`. The `Idempotency-Key` header is required: the same key with the same request answers the boost it made, and never makes another. The boost is accepted as `requested`, its budget counted against the ceiling, and made in the background, paused, then run; read it to see how that ended. It is refused, with nothing reserved or sent, when the server offers no spending, no owner allowed the account to spend, the account or its sign-in cannot run ads, the post cannot be boosted, the boost breaks Peal's rules (an end date within 90 days is required), or the monthly ceiling or the account's own spend cap has no room. Needs ads:spend; never staff acting as a member.
    /// </summary>
    WithRawResponseTask<Boost> CreateBoostAsync(
        CreateBoostAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Shows a boost and the journal of the requests Peal sent the network for it, each with how it ended. Needs ads:read.
    /// </summary>
    WithRawResponseTask<BoostDetail> GetBoostAsync(
        GetBoostAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Pauses a boost that runs or may run: its campaign is told to pause, and the boost is `paused` once the network confirms. Asked twice, it is done once. Its budget stays counted against the ceiling. Needs ads:spend or ads:manage.
    /// </summary>
    WithRawResponseTask<Boost> PauseBoostAsync(
        PauseBoostAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// **Spends money.** Runs a paused boost again, until its end. Resuming spends, so it is checked as a new boost is: spending still allowed, the account usable, and the ceiling, as it now is, not passed by what the account's boosts commit. Needs ads:spend.
    /// </summary>
    WithRawResponseTask<Boost> ResumeBoostAsync(
        ResumeBoostAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Stops a boost for good: its campaign is told to pause, and the boost is `stopped` once the network confirms; one not yet made is never made. Asked twice, it is done once. A stopped boost does not run again. What it committed is counted down to what it can have cost: nothing if it never ran, the days it ran for a daily budget, its whole budget for a total one. Needs ads:spend or ads:manage.
    /// </summary>
    WithRawResponseTask<Boost> StopBoostAsync(
        StopBoostAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the ads audit trail, newest first, 100 a page: every decision about spending and every change to a boost, with who made it and the amounts. Kept 13 months. Answers to owners alone (ads:authorize).
    /// </summary>
    WithRawResponseTask<AdAuditPage> AuditTrailAsync(
        AuditTrailAdsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
