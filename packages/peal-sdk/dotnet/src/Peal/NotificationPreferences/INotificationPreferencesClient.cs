namespace Peal;

public partial interface INotificationPreferencesClient
{
    /// <summary>
    /// Answers with which notices the user receives by email, and whether they hear about every post. Until they change it: failed and unconfirmed posts, and channels to reconnect, but not published posts, are emailed; and they hear only about the posts they wrote.
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
