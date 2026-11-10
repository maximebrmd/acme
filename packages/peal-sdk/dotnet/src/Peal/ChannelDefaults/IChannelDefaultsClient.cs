namespace Peal;

public partial interface IChannelDefaultsClient
{
    /// <summary>
    /// Answers the options new posts take on the channel when they give none there, or null. Needs post:read and channel:read.
    /// </summary>
    WithRawResponseTask<ChannelDefaults> GetAsync(
        GetChannelDefaultsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Keeps these as the channel's default options, instead of any it had: options of the channel's own platform (`TargetOptions`), unfinished as a draft's may be. A new draft, and a post made in one call, takes them on the channel when it gives no options there and no channel set it names does; a draft that is updated keeps what it is given. Defaults are a starting point, never a way round the rules: a post that takes them is checked when it is scheduled as one that wrote them itself. Needs post:update and channel:read.
    /// </summary>
    WithRawResponseTask<ChannelDefaults> SetAsync(
        NewChannelDefaults request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Leaves the channel without default options. Posts already made keep theirs. Needs post:update and channel:read.
    /// </summary>
    WithRawResponseTask ClearAsync(
        ClearChannelDefaultsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
