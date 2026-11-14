namespace Peal;

public partial interface IArticlesClient
{
    /// <summary>
    /// Lists the workspace's articles, newest first, 50 a page unless `limit` (at most 100) says otherwise, those in one `status` when it is given. Pass the page's `nextCursor` as `cursor` for the next. Needs post:read.
    /// </summary>
    WithRawResponseTask<ArticlePage> ListAsync(
        ListArticlesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Writes an article for one of the workspace's websites (a channel connected with connectSite): a draft, or scheduled at once with `schedule`. A scheduled article is checked as the site would take it (ArticleRejected lists every violation); its images are files of the workspace's library, ready (UnknownMedia otherwise), the cover an image. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:create, and post:schedule with `schedule`.
    /// </summary>
    WithRawResponseTask<Article> CreateAsync(
        NewArticle request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reads an article. Needs post:read.
    /// </summary>
    WithRawResponseTask<Article> GetAsync(
        GetArticlesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes the article from Peal, and its job when it waits to go out; never while it is being sent. A post already on the site stays there: unpublish it first. Needs post:delete.
    /// </summary>
    WithRawResponseTask DeleteAsync(
        DeleteArticlesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces what a draft, a scheduled article or one that failed says. A scheduled article is checked again and keeps its time; it is refused (ArticleRejected `approvalRequired`) while your posts need an approval. Once on the site, use updateOnSite. Needs post:update.
    /// </summary>
    WithRawResponseTask<Article> UpdateAsync(
        UpdateArticlesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Schedules a draft, moves a scheduled article, or schedules one that failed again: Peal sends it at `at`, or now without it, and the site makes it what `siteStatus` says. With `future`, the site publishes it at `at`, which must be ahead, and Peal sends it at once. Everything is checked as the site would take it. What goes out is public, and cannot be taken back from Peal but by unpublishing it. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:schedule.
    /// </summary>
    WithRawResponseTask<Article> ScheduleAsync(
        ScheduleArticlesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Takes a scheduled article back to draft: nothing is sent. Needs post:schedule.
    /// </summary>
    WithRawResponseTask<Article> UnscheduleAsync(
        UnscheduleArticlesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends a failed article again now, or one that was unconfirmed once a member checked it is not on the site: Peal never sends an unconfirmed article again on its own. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:schedule.
    /// </summary>
    WithRawResponseTask<Article> RetryAsync(
        RetryArticlesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Moves the article's post to the site's trash, where the site keeps it for a while (30 days by default on WordPress) before deleting it; it stays published in Peal, with `removedAt`. Needs post:publish; an OAuth client needs the scope workspace:publish.
    /// </summary>
    WithRawResponseTask<Article> UnpublishAsync(
        UnpublishArticlesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces what the article's post says on the site (title, body, excerpt, tags, categories, cover), at once: the site keeps its status and its date, and files it has already are not sent again; a cover or an excerpt removed is removed there. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows. Needs post:publish; an OAuth client needs the scope workspace:publish.
    /// </summary>
    WithRawResponseTask<Article> UpdateOnSiteAsync(
        UpdateOnSiteArticlesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
