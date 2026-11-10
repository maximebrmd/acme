namespace Peal;

public partial interface IPartnerAccountClient
{
    /// <summary>
    /// The workspace's partner account and what it holds, null when it has none, and whether its people may open one themselves on this server (`canOpen`). Needs partner:read.
    /// </summary>
    WithRawResponseTask<PartnerStanding> GetAsync(
        GetPartnerAccountRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Opens a partner account for the workspace, which becomes its home workspace, under the name its customers will read; answers the one it has when it has one. On a server that opens partner accounts through its staff only, answers 403 `PartnerAccountsClosed`. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client.
    /// </summary>
    WithRawResponseTask<Partner> OpenAsync(
        OpenPartner request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Closes the workspace's partner account: its keys stop working at once. Refused while it owns workspaces (409 `PartnerOwnsWorkspaces`): delete each through the partner API first. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client.
    /// </summary>
    WithRawResponseTask CloseAsync(
        ClosePartnerAccountRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes the partner account's name, its logo (an HTTPS URL, shown from that address on the hosted pages; null removes it) or its return origins: what is left out stays as it is. `returnOrigins` replaces the whole list, 20 at most: each is an origin as browsers write it (`https://app.example.com`: HTTPS, or HTTP on this machine alone, with nothing after the host and port). A hosted page sends a customer back only to an address whose origin is one of these, exactly. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client.
    /// </summary>
    WithRawResponseTask<Partner> UpdateAsync(
        PartnerChange request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the partner account's keys. Needs partner:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<PartnerKey>> ListKeysAsync(
        ListKeysPartnerAccountRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates a partner key, and answers with the key itself, which is not shown again. It acts in every workspace the partner owns, with `permissions` (what a product does for its customers: channels, media, posts, analytics, the writing assistant, webhooks, reading the plan's usage; never members, invitations, API keys or billing changes, which answer 422), and on those workspaces themselves with `scopes`. It never acts in the home workspace, nor in any workspace the partner does not own. Needs partner:manage, and a signed-in member rather than an API key or an OAuth client: keys cannot create keys.
    /// </summary>
    WithRawResponseTask<CreatedPartnerKey> CreateKeyAsync(
        NewPartnerKey request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Revokes a partner key: it stops working at once. Needs partner:manage.
    /// </summary>
    WithRawResponseTask RevokeKeyAsync(
        RevokeKeyPartnerAccountRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the workspaces the partner account owns, newest first, each with the number of channels connected in it, 50 a page unless `limit` (at most 100) says otherwise, with the filters and the paging of the partner API's list. Needs partner:read.
    /// </summary>
    WithRawResponseTask<CustomerWorkspacePage> ListWorkspacesAsync(
        ListWorkspacesPartnerAccountRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
