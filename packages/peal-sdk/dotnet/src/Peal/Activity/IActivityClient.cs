namespace Peal;

public partial interface IActivityClient
{
    /// <summary>
    /// Lists the requests that asked to change something in the workspace, newest first, 30 a page unless `limit` (at most 100) says otherwise: who asked (a member or an API key), how they authenticated, the key or the application it came through, the operation, the ids its path named, the status answered and, when it was refused or failed, the error's code. Requests that only read are not kept, and neither is anything a request or its answer carried. `operation` keeps one operation (`posts.schedule`), `actor` what one member (a user id) or one API key (its id) asked for. Pass the page's `nextCursor` as `cursor` for the next one. An event is kept 90 days. Needs activity:read, which owners hold.
    /// </summary>
    WithRawResponseTask<ActivityPage> ListAsync(
        ListActivityRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
