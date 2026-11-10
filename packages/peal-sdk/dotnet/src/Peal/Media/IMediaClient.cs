namespace Peal;

public partial interface IMediaClient
{
    /// <summary>
    /// Lists the workspace's media, newest first, 30 a page unless `limit` (at most 100) says otherwise. Pass the page's `nextCursor` as `cursor` for the next one. Needs media:read.
    /// </summary>
    WithRawResponseTask<MediaPage> ListAsync(
        ListMediaRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Records pending media and signs the upload of its file: one PUT for an image or a video up to 16 MiB, one PUT per part for a larger video. Send the file with them, then complete the upload. The requests only take the declared size and content type. On a server that bills, the declared size must fit the plan's media storage with what the workspace stores (PlanLimitReached `mediaStorage`). Needs media:upload.
    /// </summary>
    WithRawResponseTask<PreparedUpload> CreateAsync(
        NewUpload request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Fetches a file from a public address, stores it as media of the workspace and probes it, as completing an upload does: the answer is the media, ready, or uploaded with why it could not be probed. The server fetches it itself, from HTTPS URLs on the default port whose host resolves to public addresses only, without credentials or cookies, following at most three redirects, each checked the same way (MediaSourceNotPublic otherwise). The file's type is read from its first bytes, not from what the host says: JPEG, PNG, GIF and WebP images up to 16 MiB, MP4 and QuickTime videos up to 1 GiB (UnsupportedMediaType, MediaTooLarge). It must arrive within 90 seconds (MediaSourceUnreachable `tooSlow`): upload larger or slower files instead. On a server that bills, it must fit the plan's media storage with what the workspace stores (PlanLimitReached `mediaStorage`). Needs media:upload.
    /// </summary>
    WithRawResponseTask<Media> ImportFromUrlAsync(
        MediaImport request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Shows one of the workspace's media. Needs media:read.
    /// </summary>
    WithRawResponseTask<Media> GetAsync(
        GetMediaRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes the media and its file, and cancels its upload if it is still pending. Drafts that show it lose it. Posts scheduled or publishing that show it refuse the deletion (`MediaInUse`, listing them): take them back to draft first. Needs media:delete.
    /// </summary>
    WithRawResponseTask DeleteAsync(
        DeleteMediaRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sets the media's description, which platforms show to people who cannot see it. It can be written while the file uploads. Needs media:upload.
    /// </summary>
    WithRawResponseTask<Media> DescribeAsync(
        MediaDescription request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Checks that the file reached the store with the declared size and type, joining its parts first, then probes it: the media is ready, or stays uploaded with why it could not be probed. Calling it again is safe, and probes an uploaded file again. On a server that bills, the room an upload was given is held while its URLs work: completed later, it needs room in the plan's media storage again, and without it the file is deleted (PlanLimitReached `mediaStorage`). Needs media:upload.
    /// </summary>
    WithRawResponseTask<Media> CompleteAsync(
        CompleteMediaRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the posts that show the media: drafts, which lose it if it is deleted, and posts scheduled or publishing, which keep it from being deleted. Needs media:read.
    /// </summary>
    WithRawResponseTask<MediaUsage> UsageAsync(
        UsageMediaRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
