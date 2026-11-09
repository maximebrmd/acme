namespace Peal;

public partial interface ITiktokClient
{
    /// <summary>
    /// Reads a TikTok channel's creator from TikTok: their nickname, the audiences the account offers, the interactions they turned off and the longest video they may post, or why they cannot post now. A channel that is not TikTok's is ChannelNotFound. Needs post:create.
    /// </summary>
    WithRawResponseTask<TikTokAccount> CreatorAsync(
        CreatorTiktokRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
