namespace Peal;

public partial interface ISystemClient
{
    /// <summary>
    /// Answers as soon as the server is up, whatever the state of its database. Use it as a liveness or container health check.
    /// </summary>
    WithRawResponseTask HealthAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers once the server can reach its database, and fails with DatabaseUnavailable while it cannot. Use it as a readiness check before sending traffic.
    /// </summary>
    WithRawResponseTask ReadyAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the releases of the API, newest first: the operations each added and deprecated, how many additions it made in all, and any change that could break a client, which the versioning policy allows only with a reason. Needs no credentials.
    /// </summary>
    WithRawResponseTask<ApiChangelog> ChangelogAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
