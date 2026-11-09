namespace Peal;

public partial interface IApiKeysClient
{
    /// <summary>
    /// Lists the workspace's API keys. Needs apiKey:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<ApiKey>> ListAsync(
        ListApiKeysRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates an API key for the workspace with some of the caller's permissions, and answers with the key itself, which is not shown again. Needs apiKey:create, and a signed-in member: API keys cannot create keys.
    /// </summary>
    WithRawResponseTask<CreatedApiKey> CreateAsync(
        NewApiKey request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Revokes an API key of the workspace: it stops working at once. Needs apiKey:delete.
    /// </summary>
    WithRawResponseTask RevokeAsync(
        RevokeApiKeysRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
