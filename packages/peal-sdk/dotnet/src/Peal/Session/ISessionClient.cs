namespace Peal;

public partial interface ISessionClient
{
    /// <summary>
    /// Answers with the signed-in user and every workspace they belong to, with their role and permissions in each, whether the account has two-step verification on, and whether each workspace requires it (a workspace that requires it refuses the user while it is off). API keys belong to a workspace, not a user, and get 403.
    /// </summary>
    WithRawResponseTask<Me> MeAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
