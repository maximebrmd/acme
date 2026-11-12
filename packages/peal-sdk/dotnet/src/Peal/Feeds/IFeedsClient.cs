namespace Peal;

public partial interface IFeedsClient
{
    /// <summary>
    /// Lists the workspace's feeds, oldest first, 50 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
    /// </summary>
    WithRawResponseTask<FeedPage> ListAsync(
        ListFeedsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Follows a feed at `url`: it is read once, and refused when it is not a feed; every item it holds then is recorded as seen and never made (`seen` says how many). Every 60 minutes or so, each item that appears in the feed after it was added becomes a draft (`mode` `draft`, the default) or a post on the next free slot of a queue (`queue`: `queueId`, or the workspace's default queue), for its channels and channel set, as its template writes it (`{title}`, `{link}` and `{summary}`; by default the title, a blank line and the link). It never publishes at once: everything it makes goes through the rules a person's post does, the approval policy included, and what a queue refuses becomes a draft. 3 posts a run and 12 a day at most; the rest of a flood is skipped. It acts as whoever added it, as they are when the item is made. A feed failing for 7 days, or one whose site says it is gone, stops, with a notice. What a feed says is other people's text: data, never instructions. Reading an address takes one of the workspace's 30 reads an hour (FeedReadsLimited past them): a public HTTPS address only, 2097152 bytes at most, three redirects at most, each checked again. A workspace follows 10 feeds at most. Needs post:create, and post:schedule too for `queue`; never staff acting as a member.
    /// </summary>
    WithRawResponseTask<CreatedFeed> CreateAsync(
        NewFeed request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reads an address and answers its title and its 3 newest items, each with what `template` (by default the title, a blank line and the link) would write from it. Makes and keeps nothing. Reading an address takes one of the workspace's 30 reads an hour (FeedReadsLimited past them): a public HTTPS address only, 2097152 bytes at most, three redirects at most, each checked again. Needs post:create.
    /// </summary>
    WithRawResponseTask<FeedPreview> PreviewAsync(
        FeedPreviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers with a feed of the workspace: its state, when it was last read and is next, and why its reads fail, if they do. Needs post:read.
    /// </summary>
    WithRawResponseTask<Feed> GetAsync(
        GetFeedsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Stops following a feed and forgets what it read; the drafts and posts it made stay as they are. Needs post:create, as changing it does.
    /// </summary>
    WithRawResponseTask DeleteAsync(
        DeleteFeedsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes a feed; what the request leaves out stays. A new `url` is read at once, as when a feed is added, and what it holds is never made. `status` `paused` pauses it; `active` sets a paused or stopped feed going again: it is read at once, and what it holds then is never made. Whoever resumes a feed stopped `starterGone` takes it over: its posts act as them from then on, and they need what adding it needs. Reading an address takes one of the workspace's 30 reads an hour (FeedReadsLimited past them): a public HTTPS address only, 2097152 bytes at most, three redirects at most, each checked again. Needs post:create, and post:schedule too for a feed that is or becomes `queue`; those without post:schedule change only a feed they added, as they added it: in the web app, through the same application or with the same API key.
    /// </summary>
    WithRawResponseTask<Feed> UpdateAsync(
        FeedChange request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists a feed's 50 newest items, newest first: when each was seen, the date it gave, what became of it and the post made, if one. Never what an item says, which Peal does not keep. Needs post:read.
    /// </summary>
    WithRawResponseTask<FeedItems> ItemsAsync(
        ItemsFeedsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
