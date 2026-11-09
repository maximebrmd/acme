namespace Peal;

public partial interface INoticesClient
{
    /// <summary>
    /// Lists the user's notices, newest first, 20 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Each notice is data, for the client to write in the reader's language.
    /// </summary>
    WithRawResponseTask<NoticePage> ListAsync(
        ListNoticesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Counts the user's unread notices.
    /// </summary>
    WithRawResponseTask<UnreadNotices> UnreadAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Marks up to 100 of the user's notices read, and answers with how many stay unread. Ids that name none of the user's notices, and notices already read, are left as they are.
    /// </summary>
    WithRawResponseTask<UnreadNotices> MarkReadAsync(
        MarkNoticesRead request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Marks every notice of the user read.
    /// </summary>
    WithRawResponseTask<UnreadNotices> MarkAllReadAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
