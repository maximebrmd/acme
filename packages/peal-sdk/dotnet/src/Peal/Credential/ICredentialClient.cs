namespace Peal;

public partial interface ICredentialClient
{
    /// <summary>
    /// Answers who the credential this request sends is and what it may do, whatever its kind: a person's session or an OAuth client's token (`user`, with the staff member acting as the person, if any, and for an OAuth token the client's scopes and its `binding`: no workspace, the workspace it is bound to with its permissions there, or one the person has left), a workspace's API key (`apiKey`: its name, its start, its workspace, its permissions and when it expires) or a partner key (`partnerKey`: its partner, its scopes and the permissions it holds in each workspace the partner owns). Never the key or the token itself. A revoked or expired key answers 401, a suspended account 403, as on every endpoint; a workspace that requires two-step verification does not refuse this answer, which reads none of its data. It counts toward the rate limit as any request does.
    /// </summary>
    WithRawResponseTask<Credential> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
