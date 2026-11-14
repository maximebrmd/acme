namespace Peal;

public partial interface IFollowUpsClient
{
    /// <summary>
    /// Lists the workspace's follow-up rules, oldest first, 50 a page unless `limit` (at most 100) says otherwise, those of the post `postId` or with `status` alone when given, each with what its channels can carry and its latest 20 follow-ups. Pass the page's `nextCursor` as `cursor` for the next one. Needs post:read.
    /// </summary>
    WithRawResponseTask<FollowUpRulePage> ListAsync(
        ListFollowUpsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Starts a rule on a post (`postId`) or on every post a channel publishes from now on (`channelId`), exactly one of them, that waits for `likes` likes (1 to 1,000,000) and then publishes `comment`, reposts (`repost`), or both. A rule acts on the workspace's own posts only, from the channel's own account: once a post it acts on has `likes` likes on a channel, as analytics last counted them (hourly for two days, then daily: a rule never asks a platform for more, nor makes a paid read happen), it publishes its `comment` under the post, as the account's own reply after the post's last part, and reposts it when `repost` is set, once each, within 7 days of the post going live there. A post is followed up once of each kind whatever rules act on it, and a channel carries 10 follow-ups a UTC day at most: those past it wait for the next day, within their window. Comments go out on Bluesky, Mastodon and X (a post X bills, and only where the server sends X threads), reposts on Bluesky (a channel connected before Peal asked for it must be connected again) and Mastodon; LinkedIn's terms forbid both, and elsewhere `channels` says why not. Nothing likes, follows or messages anyone. It acts as whoever started it, with what they may do then: where the approval policy holds their posts it waits for a member who approves posts to approve it, and it ends when they can no longer publish. What each did is in `followUps`. A post that already went out is armed at once, while its window lasts. It is refused when no channel it acts on can carry what it asks, or when its comment is longer than a channel that could carry it takes (FollowUpNotPossible, with each channel's reasons). A post or a channel has one rule going on at a time (FollowUpRuleTaken), and a workspace 100 active or paused. It publishes again, in public, without anyone being asked each time. Needs post:schedule, or post:create where posts wait for an approval; never staff acting as a member.
    /// </summary>
    WithRawResponseTask<FollowUpRule> CreateAsync(
        NewFollowUpRule request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers with a rule of the workspace, what its channels can carry and its latest 20 follow-ups. Needs post:read.
    /// </summary>
    WithRawResponseTask<FollowUpRule> GetAsync(
        GetFollowUpsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Stops a rule: it ends `stopped`, what it armed and did not send is given up, and what it sent stays on the platforms. Stopping an ended rule changes nothing. Needs post:schedule, or to be the rule's starter acting as they started it.
    /// </summary>
    WithRawResponseTask DeleteAsync(
        DeleteFollowUpsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes a rule's `likes`, its `comment` (null takes it away) or whether it reposts, or pauses it (`paused` true) or sets it going again (false); what it leaves out stays. A follow-up that went out stays as it is; one armed sends what the rule says when it goes. Where the approval policy holds the posts of whoever changes what the rule sends, it waits for an approval again. A paused rule sends nothing, and what it armed expires with its window. An ended rule changes no more (FollowUpRuleEnded). Needs post:schedule, or to be the rule's starter acting as they started it: in the web app, through the same application or with the same API key.
    /// </summary>
    WithRawResponseTask<FollowUpRule> UpdateAsync(
        FollowUpRuleChange request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Approves what a rule sends, for a rule whose starter's posts wait for an approval: it then acts as it is. A rule approved, or that needs no approval, is answered as it is. Needs post:approve, in person: an API key or an application never approves.
    /// </summary>
    WithRawResponseTask<FollowUpRule> ApproveAsync(
        ApproveFollowUpsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
