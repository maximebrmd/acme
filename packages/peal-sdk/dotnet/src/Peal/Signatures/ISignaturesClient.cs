namespace Peal;

public partial interface ISignaturesClient
{
    /// <summary>
    /// Lists the workspace's signatures, oldest first. Needs post:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<Signature>> ListAsync(
        ListSignaturesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Adds a signature to the workspace: a name no other signature of the workspace has whatever its case, a text of 2000 characters at most, and the `scope` it is meant for (the whole `workspace`, a `platform`, or one `channel` of the workspace). With `isDefault`, new posts that ask for the default signatures take it in its scope, and the signature that was the default of that scope is one no longer. A signature is text of the post once added: it counts against each platform's limit when the post is scheduled. A workspace keeps 50 signatures at most. Needs post:update, and channel:read for a channel's.
    /// </summary>
    WithRawResponseTask<Signature> CreateAsync(
        CreateSignaturesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces a signature's name, text, scope and whether it is a default. Posts that already hold its text keep it as it was. Needs post:update, and channel:read for a channel's.
    /// </summary>
    WithRawResponseTask<Signature> UpdateAsync(
        UpdateSignaturesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes a signature. Posts that already hold its text keep it. Needs post:update.
    /// </summary>
    WithRawResponseTask DeleteAsync(
        DeleteSignaturesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
