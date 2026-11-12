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
    /// Answers a workspace's analytics over a range in one call: the totals of the posts published in it and of those published in the range before, of the same length, so a client shows the trend; followers at the end of each and their change; the same by channel and by platform; each day's gains, followers and account views; and the `topPosts` (5 unless said, 25 at most) with the most engagement. The range is `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA zone such as Europe/Paris. Followers are kept from the day a channel is connected, read once a day; a number a platform does not give is null, never zero. Needs analytics:read.
    /// </summary>
    WithRawResponseTask<AnalyticsDashboard> DashboardAsync(
        DashboardAnalyticsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers one channel's numbers day by day: its followers, the accounts it follows and its posts as read each UTC day, the views and reach its platform counted, and what its posts published in the range gained. The range is `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA zone such as Europe/Paris. A channel Peal has read nothing of answers days without numbers. Needs analytics:read.
    /// </summary>
    WithRawResponseTask<ChannelSeries> ChannelAsync(
        ChannelAnalyticsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Streams the workspace's analytics as a file: `kind=posts` lists each post published in the range on each channel with its latest counts, `kind=accounts` each channel's account day by day. `format=csv` (the default) writes a header line then one line a row, as RFC 4180; `format=json` writes one JSON object a line (`application/x-ndjson`). A number a platform does not give is empty in CSV and null in JSON. The range is `days` (7, 30 or 90: that many days ending today in `timeZone`), or `from` and `to`, both included and at most 366 days; `timeZone` is an IANA zone such as Europe/Paris. Needs analytics:read.
    /// </summary>
    WithRawResponseTask<global::System.IO.Stream> ExportAsync(
        ExportAnalyticsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers when one channel's posts did best, by weekday and hour as `timeZone` (an IANA zone) runs them, over the last `days` (30, 90 or 180, 90 unless given; fewer where the platform lets Peal keep less): for each hour, how many of its posts went live in it and the median of what each was given, likes, reposts, replies and quotes together, those the platform gives (`counted` is false where it gives none). It describes this channel's past and predicts nothing: counts of different platforms are never added, an hour with fewer than 3 posts has no median, and a channel with fewer than 20 posts in the range answers `enough: false` with no ranking. `best` lists at most 5 hours, by median then by posts. Posts younger than 48 hours are left out (`recent`), as are posts Peal deleted from the platform. Needs analytics:read.
    /// </summary>
    WithRawResponseTask<BestTimes> BestTimesAsync(
        BestTimesAnalyticsRequest request,
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
