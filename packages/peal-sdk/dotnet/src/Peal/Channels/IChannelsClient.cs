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
    /// Lists the platforms this server can connect accounts of, in Peal's order. A platform that needs a setting the server lacks, such as an app registered on LinkedIn, X or Meta or a Google OAuth client, is left out. Needs channel:connect.
    /// </summary>
    WithRawResponseTask<ConnectablePlatforms> PlatformsAsync(
        PlatformsChannelsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Starts connecting an account of the platform: answers with the platform's sign-in page, where the browser goes next. The connection is tied to the caller and the workspace, and must be completed within 15 minutes. On a server that bills, a workspace whose plan allows no more channels gets PlanLimitReached. Needs channel:connect.
    /// </summary>
    WithRawResponseTask<Authorization> ConnectAsync(
        ConnectChannel request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Completes a connection with what the platform sent back: the account becomes a channel of the workspace, or the channel it reconnects takes its new tokens. When the sign-in reached several accounts, as the Pages a Facebook user manages, the answer lists them instead, to choose with chooseAccounts. Only the member who started the connection can complete it, once. A new account needs room in the workspace's plan (PlanLimitReached). Needs channel:connect.
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
    /// Starts reconnecting a channel whose token stopped working or is about to: answers with the platform's sign-in page. Completing it must sign in to the same account. A channel the workspace has takes no room in its plan, so no plan limit refuses it. Needs channel:connect.
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
}
