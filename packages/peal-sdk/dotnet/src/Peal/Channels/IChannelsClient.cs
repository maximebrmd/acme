namespace Peal;

public partial interface IChannelsClient
{
    /// <summary>
    /// Lists the channels connected to the workspace, oldest first. Their tokens are never shown. Needs channel:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<Channel>> ListAsync(
        ListChannelsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the workspace's channels a page at a time, oldest first: 50 unless `limit` (at most 100) says otherwise. Every filter given must hold: `platform`, `status` (`active`, `refreshNeeded` or `disabled`) and `q`, text the channel's handle, the name its platform shows or the name the workspace gave it holds, whatever its case. `counts` says how many channels the platform and text match in each status, whatever the status asked for. Pass the page's `nextCursor` as `cursor`, with the same filters, for the next page; a cursor no page gave is a bad request. Needs channel:read.
    /// </summary>
    WithRawResponseTask<ChannelPage> FindAsync(
        FindChannelsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the platforms this server can connect accounts of, in Peal's order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.
    /// </summary>
    WithRawResponseTask<ConnectablePlatforms> PlatformsAsync(
        PlatformsChannelsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes next. For Instagram, `connection` picks Instagram Login (the professional account itself, no Facebook Page needed) or Facebook Login (the accounts linked to the caller's Pages); without it, the server's preferred way. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached, and an X account needs a payment method on per-account pricing, as X's calls are billed at X's rates (UsageAllowanceReached `xApi`, `paymentMethodRequired` without one). Needs channel:connect.
    /// </summary>
    WithRawResponseTask<Authorization> ConnectAsync(
        ConnectChannel request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached), and, on a server that bills, an X account a payment method (UsageAllowanceReached `xApi`). Needs channel:connect.
    /// </summary>
    WithRawResponseTask<ConnectOutcome> CompleteConnectAsync(
        ConnectCallback request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Connects the accounts the member chose among those a completed sign-in listed: each becomes a channel of the workspace, or reconnects the one it has. The new accounts chosen need room in the workspace's plan, all of them: otherwise none is connected (PlanLimitReached), and the choice can be made again with fewer. Only the member who completed the sign-in can choose, within 15 minutes, and once an account is connected: a choice that failed before connecting any can be made again. Needs channel:connect.
    /// </summary>
    WithRawResponseTask<IEnumerable<Channel>> ChooseAccountsAsync(
        ChooseAccounts request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. With `messages=true`, the sign-in also asks for the account's direct messages where the platform asks for them apart: on Bluesky, the chat methods' permissions, which turning a channel's messages on needs (`setChannelMessages` answers 409 `InboxActionUnavailable`, `reconnect`, until they are granted). A reconnect of a Bluesky channel that granted them asks them again, so its messages stay readable. With `reposts=true`, a Bluesky sign-in also asks to repost the account's own posts, which a follow-up rule that reposts there needs (its channel shows `reconnect` until it is granted); a reconnect of a channel that granted it asks it again. Needs channel:connect.
    /// </summary>
    WithRawResponseTask<Authorization> ReconnectAsync(
        ReconnectChannelsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Disconnects a channel from the workspace: the channel and the tokens Peal holds for it are deleted, and nothing more is posted on it. Needs channel:disconnect.
    /// </summary>
    WithRawResponseTask DisconnectAsync(
        DisconnectChannelsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gives the channel the name the workspace calls it by (`label`, 60 characters at most, on one line), or takes it back with null. The name is Peal's own: it is shown beside the handle and name the platform gives the account, which stay, and is sent to no platform. Needs channel:connect.
    /// </summary>
    WithRawResponseTask<Channel> UpdateAsync(
        ChannelUpdate request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Turns the channel off: nothing goes out on it until it is turned back on. It keeps its connection, its history, its name and its place in the plan's count, and no reconnect reminder is sent meanwhile. A post that reaches its time while the channel is off fails on that channel (`channelDisabled`) and goes out on its others; it is not sent later. A channel already off stays as it is. Needs channel:connect.
    /// </summary>
    WithRawResponseTask<Channel> DisableAsync(
        DisableChannelsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Turns a channel back on. It posts again at once, or has the status `refreshNeeded` when its token stopped working or ran out while it was off: reconnect the account then. A channel that is on stays as it is. Needs channel:connect.
    /// </summary>
    WithRawResponseTask<Channel> EnableAsync(
        EnableChannelsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
