namespace Peal;

public partial interface IConnectLinksClient
{
    /// <summary>
    /// Lists the workspace's connect links, newest first, the last 100: those waiting, and those used, revoked or expired in the last 30 days. Needs channel:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<ConnectLink>> ListAsync(
        ListConnectLinksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates a link to hand to whoever owns an account of `platform`: it opens a hosted page where they sign in at the platform and, when the sign-in reaches several accounts, pick those to connect, without a Peal account. The answer holds the link's address, shown this once. The link works once, for 168 hours unless `expiresInHours` (1 to 720) says otherwise; with `channelId`, it reconnects that channel, and only a sign-in to the channel's own account goes through. `returnUrl` is where the page sends them once done, with `peal_link` (the link's id) and `peal_status` (`connected`, `cancelled` or `failed`) in its query: read the link by its id to know what was connected, as anyone can write those parameters. Its origin must be one the workspace's partner account registered, exactly (422 `ReturnUrlNotAllowed` otherwise, and for a workspace without a partner account). Whoever holds the address can connect an account of theirs to the workspace until it is used, revoked or expired: hand it over a channel you trust, and revoke it when it is no longer needed. A platform this server cannot connect answers 422 `ConnectFailed`. A workspace has 100 links waiting at most. Needs channel:connect.
    /// </summary>
    WithRawResponseTask<CreatedConnectLink> CreateAsync(
        NewConnectLink request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// One connect link of the workspace: where it stands, the channels it connected once `completed`, and how its last sign-in failed. Read it when a browser comes back to your return address, or on `channel.connected`. Needs channel:read.
    /// </summary>
    WithRawResponseTask<ConnectLink> GetAsync(
        GetConnectLinksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Takes a connect link back: it opens nothing more, and a sign-in in progress through it does not complete. A link already used, revoked or expired stays as it is. Answers the link as it now stands. Needs channel:connect.
    /// </summary>
    WithRawResponseTask<ConnectLink> RevokeAsync(
        RevokeConnectLinksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
