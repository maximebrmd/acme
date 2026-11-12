namespace Peal;

public partial interface IShortLinksClient
{
    /// <summary>
    /// Answers whether this server shortens links (`available`), what a short address starts with (`base`) and how long it is (`shortLength`), and whether the workspace's new posts ask for short links by default (`byDefault`). A post that asks (`shortenLinks`) goes out with each link written with `http://` or `https://` and longer than a short address replaced by one, one per channel and link, which redirects to it and counts the visit; the text kept stays as written, and Pinterest always gets links as written. Needs post:read.
    /// </summary>
    WithRawResponseTask<ShortLinkStatus> StatusAsync(
        StatusShortLinksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sets whether the workspace's new posts ask for short links unless their author says otherwise; each post still chooses for itself. Needs organization:update, which owners and admins hold.
    /// </summary>
    WithRawResponseTask<ShortLinkStatus> SetDefaultAsync(
        ShortLinkSettings request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the workspace's short links, newest first, 50 a page unless `limit` (at most 100) says otherwise, those of one post (`postId`) or one channel (`channelId`), each with its clicks from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today). Pass the page's `nextCursor` as `cursor` for the next one. Clicks are counted by UTC day and kept 400 days; a request from an automated reader (a crawler, a link preview), a prefetch or a HEAD is redirected but not counted, so the figure is approximate, and nothing about the visitor is kept. Needs analytics:read.
    /// </summary>
    WithRawResponseTask<ShortLinkPage> ListAsync(
        ListShortLinksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers one short link with its clicks each day from `from` to `to` (UTC days, both included, at most 92; by default the 30 days that end today), oldest first. Clicks are counted by UTC day and kept 400 days; a request from an automated reader (a crawler, a link preview), a prefetch or a HEAD is redirected but not counted, so the figure is approximate, and nothing about the visitor is kept. Needs analytics:read.
    /// </summary>
    WithRawResponseTask<ShortLinkReport> GetAsync(
        GetShortLinksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
