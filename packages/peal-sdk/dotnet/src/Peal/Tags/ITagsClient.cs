namespace Peal;

public partial interface ITagsClient
{
    /// <summary>
    /// Lists the workspace's tags, oldest first. A post names its tags by id (`tagIds`). Needs post:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<Tag>> ListAsync(
        ListTagsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Adds a tag to the workspace: a name of 40 characters at most, on one line, which no other tag of the workspace has whatever its case, and a colour of the palette. A workspace keeps 100 tags at most. Needs post:update.
    /// </summary>
    WithRawResponseTask<Tag> CreateAsync(
        CreateTagsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes a tag, and takes it off every post that had it; the posts stay. Needs post:update.
    /// </summary>
    WithRawResponseTask DeleteAsync(
        DeleteTagsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gives a tag another name or colour. Its posts keep it. Needs post:update.
    /// </summary>
    WithRawResponseTask<Tag> UpdateAsync(
        UpdateTagsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
