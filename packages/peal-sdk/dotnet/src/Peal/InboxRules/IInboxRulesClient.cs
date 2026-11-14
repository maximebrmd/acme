namespace Peal;

public partial interface IInboxRulesClient
{
    /// <summary>
    /// Lists the workspace's comment rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise, those with `status` alone when given, each with what its channels can carry and the latest 20 comments it matched. Needs engagement:read.
    /// </summary>
    WithRawResponseTask<CommentRulePage> ListCommentRulesAsync(
        ListCommentRulesInboxRulesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Starts a rule on the comments of a post that went out (`postId`) or of every post of a channel (`channelId`), exactly one of them, with 1 to 10 `keywords` and a `reply`. A rule answers, by itself and in public, as the channel's account, a comment received after it started, under a post it answers on, that holds one of its keywords as a word (whatever its case and accents): with its `reply`, once a comment and once a person, 25 replies a day at most, through the inbox's own replies (their journal, one reply a comment, each one of the billing account's outbound messages). It answers on Mastodon, and on Facebook Pages and Instagram where the server reads their comments; Bluesky's, X's, LinkedIn's and YouTube's rules forbid an app to answer by itself, and `channels` says so. It never likes, follows or messages anyone privately. It acts as whoever started it, with what they may do then: it ends when they can no longer answer comments. It is refused when no channel it answers on can carry its reply (CommentRuleNotPossible, with each channel's reason). A workspace keeps 100 rules active or paused. Needs engagement:reply; never staff acting as a member.
    /// </summary>
    WithRawResponseTask<CommentRule> CreateCommentRuleAsync(
        NewCommentRule request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers a comment rule of the workspace, what its channels can carry and what it matched. Needs engagement:read.
    /// </summary>
    WithRawResponseTask<CommentRule> GetCommentRuleAsync(
        GetCommentRuleInboxRulesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Stops a rule: it answers nothing more; the replies it sent stay, and the inbox withdraws one as any other. Needs engagement:reply.
    /// </summary>
    WithRawResponseTask DeleteCommentRuleAsync(
        DeleteCommentRuleInboxRulesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes a rule's keywords or reply, or pauses it (`paused` true) or sets it going again (false); what it leaves out stays. A paused rule looks at nothing, and answers no comment received while it was paused. An ended rule changes no more (CommentRuleEnded). Needs engagement:reply.
    /// </summary>
    WithRawResponseTask<CommentRule> UpdateCommentRuleAsync(
        CommentRuleChange request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
