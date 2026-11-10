namespace Peal;

public partial interface ICapabilitiesClient
{
    /// <summary>
    /// Describes what a post may hold on every platform, in Peal's order, whether or not the workspace has a channel there: how its text is counted and limited, the images and videos it takes, its options field by field, the lookups that answer their values, and whether Peal reads each post's counts. These are the rules Peal checks when a post is scheduled; a null limit is one Peal does not check, which the platform may still apply. Needs channel:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<PlatformCapabilities>> PlatformsAsync(
        PlatformsCapabilitiesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Describes what a post on this channel may hold: its platform's capabilities, and what its own account narrows in them, read from the platform now (a TikTok creator's audiences, the interactions they turned off, their longest video). When the platform cannot be asked, `account` says why and the platform's capabilities are answered alone. Needs channel:read.
    /// </summary>
    WithRawResponseTask<ChannelCapabilities> ChannelAsync(
        ChannelCapabilitiesRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
