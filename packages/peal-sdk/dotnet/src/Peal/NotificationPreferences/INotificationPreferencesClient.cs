namespace Peal;

public partial interface INotificationPreferencesClient
{
    /// <summary>
    /// Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, channels to reconnect, posts to review, recycling rules that ended and webhook deliveries failing, but not published posts nor comments, are emailed; and they hear only about the posts they wrote.
    /// </summary>
    WithRawResponseTask<NotificationPreferences> GetAsync(
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes the preferences given, keeps the others, and answers with them all. Staff impersonating the user may not change them.
    /// </summary>
    WithRawResponseTask<NotificationPreferences> UpdateAsync(
        NotificationPreferencesChange request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
