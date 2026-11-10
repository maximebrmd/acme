namespace Peal;

public partial interface IReviewClient
{
    /// <summary>
    /// Answers with the workspace's approval policy: which of its posts wait for an approval before they are scheduled. Needs post:read.
    /// </summary>
    WithRawResponseTask<ReviewSettings> SettingsAsync(
        SettingsReviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Chooses the workspace's approval policy. It applies to posts scheduled from then on: a post already scheduled stays scheduled, and one that waits still waits. Needs organization:update, and is refused to staff acting as a member.
    /// </summary>
    WithRawResponseTask<ReviewSettings> UpdateSettingsAsync(
        UpdateSettingsReviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the approvals that wait in the workspace, oldest first, 100 at most. Needs post:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<ApprovalRequest>> PendingAsync(
        PendingReviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers with a post's review: its comments, oldest first, and the approvals asked for it and what was decided, newest first. Needs post:read.
    /// </summary>
    WithRawResponseTask<PostReview> ThreadAsync(
        ThreadReviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Comments on a post, starts a thread about one of its channels or some words of its text there, or answers a thread. The text is kept as plain text, 2000 characters at most, without control characters. Those who follow the post are told. Needs post:create or post:approve.
    /// </summary>
    WithRawResponseTask<ReviewComment> CommentAsync(
        NewComment request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Resolves the thread a comment started, or reopens it. An answer is not resolved: its thread is (CommentInvalid, `parent`). Needs post:create or post:approve.
    /// </summary>
    WithRawResponseTask<ReviewComment> ResolveAsync(
        ResolveReviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Approves a post that waits for an approval: it is scheduled for the time it was asked for, and its job starts. Approved after that time (beyond a minute), nothing is published late: the post goes back to draft, still approved, and `late` is true; scheduling it again needs no new approval while it says the same. Recorded with who approved and when. Needs post:approve, and is refused to staff acting as a member.
    /// </summary>
    WithRawResponseTask<ApprovalOutcome> ApproveAsync(
        ApproveReviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends a post that waits for an approval back to draft, with a comment that says what to change. Its author and whoever asked are told. Needs post:approve, and is refused to staff acting as a member.
    /// </summary>
    WithRawResponseTask<ChangesOutcome> RequestChangesAsync(
        ChangesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists a post's review links, newest first, ended ones included. No token is shown: a link's address is told once, when it is made. Needs post:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<ReviewLink>> LinksAsync(
        LinksReviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Makes a link that shows a draft, a post that waits for an approval or a scheduled post to whoever holds it, without an account: the post as each channel will receive it, and nothing else of the workspace. It lets them view, comment, or approve, and works 14 days unless `expiresInHours` says otherwise (90 days at most), until it is revoked, or the post is published, cancelled or deleted. A post has 20 working links at most. The answer holds the link's address, which is not shown again. Needs post:approve, and is refused to staff acting as a member.
    /// </summary>
    WithRawResponseTask<CreatedReviewLink> CreateLinkAsync(
        NewReviewLink request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Ends a review link at once: whoever opens it is told it was revoked. Needs post:approve, and is refused to staff acting as a member.
    /// </summary>
    WithRawResponseTask<ReviewLink> RevokeLinkAsync(
        RevokeLinkReviewRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
