namespace Peal;

public partial interface ISessionClient
{
    /// <summary>
    /// Answers with the signed-in user and every workspace they belong to, with their role and permissions in each. API keys belong to a workspace, not a user, and get 403.
    /// </summary>
    WithRawResponseTask<Me> MeAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
