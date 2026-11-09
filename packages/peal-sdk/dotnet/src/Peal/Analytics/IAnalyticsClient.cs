namespace Peal;

public partial interface IAnalyticsClient
{
    /// <summary>
    /// Sums up the posts published from `from` to `to`, both included and at most 366 days, as days run in `timeZone` (an IANA zone such as Europe/Paris): their latest counts in all and by channel, what they gained each day, and the five with the most engagement (likes, reposts, replies and quotes). Counts are read from the platforms every hour for 48 hours after a post goes live, then every day until it is 30 days old. Needs analytics:read.
    /// </summary>
    WithRawResponseTask<AnalyticsSummary> SummaryAsync(
        SummaryAnalyticsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers with the counts of a post on each channel it went live on, over time. A post not published yet, or whose counts were not read yet, has no targets. Needs analytics:read.
    /// </summary>
    WithRawResponseTask<PostAnalytics> PostAsync(
        PostAnalyticsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
