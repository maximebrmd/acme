namespace Peal;

public partial interface IUsageClient
{
    /// <summary>
    /// Answers what the workspace uses of its plan now, and day by day from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today): each day's posts that went out, one per channel they went out on, by platform, and its requests to the writing assistant; the channels it connected, its members and the media it stored as the daily snapshot found them shortly after each day ended, null (requests included) for a day the server took no snapshot of, today's among them; then the period's totals, with its channel-days and, for each calendar month it touches, its posts on platforms that bill the server per post, each part of a thread counted as the platform bills it (a thread is one of the day's posts). Usage is kept 400 days. Counts only: nothing here is priced or limits anything. On a server that does not bill, `plan` and `allowances` are null. Needs billing:read.
    /// </summary>
    WithRawResponseTask<WorkspaceUsageReport> GetAsync(
        GetUsageRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
