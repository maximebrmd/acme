namespace Peal;

public partial interface IPostsClient
{
    /// <summary>
    /// Lists the workspace's drafts, newest first, 20 a page unless `limit` (at most 50) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
    /// </summary>
    WithRawResponseTask<DraftPage> DraftsAsync(
        DraftsPostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the posts scheduled from `from` (included) to `to` (excluded), at most 62 days apart, by scheduled instant, with their channels and how each went. Drafts have no time and are not listed; cancelled posts are, with the time they had. Needs post:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<Post>> ListAsync(
        ListPostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates a draft for some of the workspace's channels, possibly none yet, with options on those whose platform takes them (`TargetOptions`, of the channel's platform). Its media must be the workspace's, and ready. Its text, media and options are checked against each platform's rules when it is scheduled, not before. Needs post:create, channel:read, and media:read when it shows media.
    /// </summary>
    WithRawResponseTask<Post> CreateAsync(
        CreatePostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the workspace's posts, whatever their state, a page at a time: 20 unless `limit` (at most 100) says otherwise. Every filter given must hold: `status` (draft, scheduled, publishing, finished, cancelled), `outcome` (how a finished post ended, such as `failed` or `partiallyPublished`), `channelId` (posts with a target on that channel), `platform` (posts with a target on a connected channel of that platform), `from` (included) and `to` (excluded), on the scheduled instant, which leave out posts without a time, `createdVia` (`web`, `apiKey` or `application`) and `authorId`. `sort` orders them by creation (`createdDesc`, the default, or `createdAsc`) or by scheduled instant (`scheduledDesc`, `scheduledAsc`, which list only posts with a time). Pass the page's `nextCursor` as `cursor`, with the same filters and sort, for the next page: a cursor marks where its page ended, so posts created, moved or deleted meanwhile make no page repeat or skip one; a cursor of another sort, or none a page gave, is a bad request. Each post comes whole, with its targets, their status, address and failure reason, and `channels` gives the platform of each channel the page names. Needs post:read and channel:read.
    /// </summary>
    WithRawResponseTask<PostPage> SearchAsync(
        SearchPostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates a post and sends it to some of the workspace's channels in one call: `when` is `now`, which publishes at once, or `at` an instant, kept with its IANA time zone. It goes through every rule scheduling a draft does (each platform's limits on text, media and options, the account's own, the plan's), and answers every violation at once (PostContentInvalid): nothing is made then. In a workspace that asks for approvals, a post that needs one is answered with the status `awaitingApproval`: it keeps its time and goes out only once it is approved. What it publishes reaches the platforms' public, and cannot be taken back from Peal once it is out; until its time, cancel or unschedule it. Send an `Idempotency-Key` header (any text of your choosing, at most 255 characters, such as a UUID) to make a request safe to send again: within 24 hours, the same key with the same body answers the post the first request made, as it now stands, and makes no other; the same key with another body is refused (IdempotencyKeyReused), and answers PostNotFound once that post was deleted. Keys are kept per workspace, as digests. Apart from keys, a post whose content already goes to one of its channels less than 23 hours from its time is refused (DuplicatePost), as a request made twice by mistake would be, unless it says `allowDuplicate: true`; scheduling a draft is not checked. It answers as soon as the post is made, while it publishes, unless `wait` says to wait for the outcome: up to that many seconds (60 at most) for a post that goes out now, the answer is then the post once every channel has its result (`status` `finished`, with its `outcome`, each target `published` with its `permalink` or `failed` with its `failureReason`), or the post as it stands when the time runs out, some targets still `pending` or `publishing`: it goes on publishing, and `GET …/posts/{postId}/outcome` waits for the rest. The answer is 201 either way: the post was made. Needs post:schedule and channel:read, and media:read when it shows media; an OAuth client needs the scope workspace:publish.
    /// </summary>
    WithRawResponseTask<Post> SendAsync(
        NewPost request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates and sends up to 50 posts in one request, each as `send` would: one post per item, each with its own channels, content, options and time, so the same content at several times, or at a time of its own on each channel, is several items. Items are taken in order, one at a time, each on its own: one refused keeps none of the others from being made, and nothing is undone. The answer is 200 whenever the request itself was read, even if every item was refused: `items` says, for each by its place in the request, `created` with its post, or `refused` with what `send` would have answered for it alone (its content's violations, unknown channels or media, a time gone by, the plan's limit, a duplicate). A request that cannot be read at all (malformed, no item, more than 50) is 400, and makes nothing. The plan's limits hold across the request: once the month has no room, the items left are refused. Each item is checked against the posts made before it, the request's earlier items included, for the same content on the same channel (DuplicatePost). An `Idempotency-Key` header makes the whole request safe to send again within 24 hours: each item is kept under the key and its place, so the same request sent again answers the posts it made (`replayed`), makes those that were not made the first time if they now can be, and an item that changed under the same key is refused (IdempotencyKeyReused). An item's own `idempotencyKey` is used instead of the header's for that item. Needs post:schedule and channel:read, and media:read for the items that show media; an OAuth client needs the scope workspace:publish.
    /// </summary>
    WithRawResponseTask<BulkResult> BulkAsync(
        BulkPosts request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates and sends the posts a CSV file lists, one per row, at most 100 rows under its first line, which names the columns, in any order: `text` and `channels` (channel ids separated by spaces, commas or semicolons) are required columns, `at` too (`now`, an instant with its offset such as 2026-11-20T09:00:00Z, or a local time without one such as 2026-11-20 10:00, read in the row's `time_zone`, an IANA zone, UTC if left out); `media` (ids of ready media of the workspace), `allow_duplicate` (`true` or `false`) and `idempotency_key` are optional. Cells follow RFC 4180, strictly: a cell with a comma, a quote or a line break is written between double quotes, a quote inside it doubled; a quote anywhere else is ImportUnreadable (`strayQuote`). Blank lines are no rows. The file is checked first, every row, as `validate` checks a post and as the file it is (a row an earlier row leaves no room for in its month, one that repeats an earlier row's content near its time, and one that carries an earlier row's key with another post are refused; a row with more or fewer cells than the first line names is unreadable, never guessed); unless every row is valid, nothing is made, and `rows` says which are `valid`, `refused` (with what `send` would have answered) or `unreadable` (with the cells at fault). `dryRun` stops there even when every row is valid. Otherwise the rows are then made in order as `bulk` makes its items, each `created` or, when something changed since the check or a row repeats an earlier one, `refused`. The answer is 200 once the file was read; a file that cannot be read at all is ImportUnreadable. An `Idempotency-Key` header works as on `bulk`, by row. Needs post:schedule, post:read and channel:read, and media:read for rows with media; an OAuth client needs the scope workspace:publish.
    /// </summary>
    WithRawResponseTask<ImportResult> ImportAsync(
        PostImport request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Checks a post without making it, and changes nothing: send what `send` takes, or a draft (no `when`). It answers 200 whether or not the post would go through, with `valid` and everything that would refuse it, all at once: per channel, the text the channel receives, counted as its platform counts it against each of its limits, its hashtags, mentions, links and media, and every violation of the platform's rules (text, media formats, sizes, counts and durations, options) and of the account's own where its platform tells them; the channels and media that are not the workspace's; and, when `when` is given, whether the time can be kept, whether the workspace's plan has room, and the channels that already have the same content from another post (`duplicates`, as DuplicatePost tells them; none with `allowDuplicate`). A post that is valid now can still be refused later: a channel disconnected, a plan's month filled meanwhile. Needs post:read and channel:read, and media:read when it shows media.
    /// </summary>
    WithRawResponseTask<PostValidation> ValidateAsync(
        PostToValidate request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers with a post of the workspace. Needs post:read.
    /// </summary>
    WithRawResponseTask<Post> GetAsync(
        GetPostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces a draft's content, channels and options: options left out are removed. A post that is no longer a draft is a conflict. Needs post:update, channel:read, and media:read when it shows media.
    /// </summary>
    WithRawResponseTask<Post> UpdateAsync(
        UpdatePostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes a draft. A post scheduled or sent is a conflict: cancel it instead. Needs post:delete, or post:update for the user who created the draft.
    /// </summary>
    WithRawResponseTask DiscardAsync(
        DiscardPostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers with a post once it has gone out: it waits up to `wait` seconds (60 at most; none unless given) until every channel has its result, and answers the post then (`status` `finished`), or as it stands when the time runs out, which a client asks again. A draft, a cancelled post and a post scheduled for later than the wait are answered at once. Waiting changes nothing and holds nothing: the post publishes in its own job either way. Needs post:read.
    /// </summary>
    WithRawResponseTask<Post> OutcomeAsync(
        OutcomePostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists every attempt Peal made at publishing the post, by channel, round and attempt, with how each ended. An attempt still in progress is not listed yet. Needs post:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<PublicationAttempt>> AttemptsAsync(
        AttemptsPostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Schedules a draft on some of the workspace's channels at an instant, kept with the IANA time zone it was chosen in. The content must fit each platform's rules, its media included: file types, sizes, durations, dimensions, alt text, how many videos, and whether images and videos go together. A channel whose platform takes options needs those it requires, as the draft gives them on that channel: a channel the draft was not for has none yet. A time up to a minute ago publishes now. On a server that bills, the posts going out in that month (UTC) must fit the workspace's plan (PlanLimitReached). Where the workspace asks for an approval of this post (its approval policy), the post is not scheduled: it answers with the status `awaitingApproval`, keeps its time, and goes out only once approved; contributors may then ask too, with post:create. Needs post:schedule and channel:read, and media:read when it shows media.
    /// </summary>
    WithRawResponseTask<Post> ScheduleAsync(
        SchedulePost request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Moves a scheduled post, or one awaiting approval, to another instant, or schedules a draft on the channels it has. A post that needs an approval it does not have waits for it (`awaitingApproval`). Moved to another month, or scheduled, it must fit that month's posts in the workspace's plan (PlanLimitReached). Needs post:schedule, and channel:read for a draft.
    /// </summary>
    WithRawResponseTask<Post> RescheduleAsync(
        ReschedulePostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Takes a scheduled post back to draft, so its text and media can change: it goes out at no time until it is scheduled again. A post already publishing is a conflict. Needs post:schedule.
    /// </summary>
    WithRawResponseTask<Post> UnscheduleAsync(
        UnschedulePostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends the post again, now, on one channel where it failed or is unconfirmed: a new round, with its own attempts. Check the platform first when it is unconfirmed, as it may be live already. Needs post:schedule.
    /// </summary>
    WithRawResponseTask<Post> RepostAsync(
        RepostPostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Says what you found on the platform for a post unconfirmed on one channel: `published`, with its address if you have it, or `notPublished`, which fails it there so it can be reposted. Its notifications are marked read. Needs post:schedule.
    /// </summary>
    WithRawResponseTask<Post> ConfirmAsync(
        ConfirmPostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Cancels a draft, a scheduled post or one awaiting approval. A post already publishing finishes with what its channels did: those not yet sent are cancelled. Needs post:schedule.
    /// </summary>
    WithRawResponseTask<Post> CancelAsync(
        CancelPostsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
