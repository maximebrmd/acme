namespace Peal;

public partial interface IChannelSetsClient
{
    /// <summary>
    /// Lists the workspace's channel sets, oldest first, each with the channels it keeps and those of them disconnected since (`unavailableChannelIds`). Needs post:read and channel:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<ChannelSet>> ListAsync(
        ListChannelSetsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Saves a selection of the workspace's channels under a name no other set of the workspace has whatever its case, 50 channels at most, with the options posts take on those whose platform has some (`TargetOptions`, of the channel's platform; unfinished options are kept, and checked when a post that takes them is scheduled). A post names a set by its id or its name (`channelSets`) instead of listing its channels. A workspace keeps 50 sets at most. Needs post:update and channel:read.
    /// </summary>
    WithRawResponseTask<ChannelSet> CreateAsync(
        CreateChannelSetsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces a set's name, channels and options: every channel must be connected now, so this is also how a disconnected one is taken out. Posts made with the set before keep their channels. Needs post:update and channel:read.
    /// </summary>
    WithRawResponseTask<ChannelSet> UpdateAsync(
        UpdateChannelSetsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes a channel set. Its channels, and the posts made with it, stay. Needs post:update.
    /// </summary>
    WithRawResponseTask DeleteAsync(
        DeleteChannelSetsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
