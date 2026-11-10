namespace Peal;

public partial interface ILookupsClient
{
    /// <summary>
    /// Lists the lookups the channel has: what its platform tells about the account that a post's options refer to, such as the categories a YouTube video can be filed under. Each says the input it takes and the options it fills. Empty for a platform without lookups. Needs channel:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<LookupDescription>> ListAsync(
        ListLookupsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Runs one of the channel's lookups: asks the platform now, with the channel's token, and answers a page of items tagged by the lookup's name. It changes nothing, on Peal or on the platform. A paged lookup names the next page in `nextCursor`, to send back as `cursor`. A name the channel's platform does not have is LookupNotFound; an input the lookup does not take, LookupInputInvalid; a channel turned off or to reconnect, ChannelCannotPost; a platform that did not answer, PlatformUnreachable, and one that asked to slow down, PlatformRateLimited. Needs channel:read.
    /// </summary>
    WithRawResponseTask<LookupResult> RunAsync(
        LookupInput request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
