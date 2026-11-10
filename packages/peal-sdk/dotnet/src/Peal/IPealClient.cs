namespace Peal;

public partial interface IPealClient
{
    public ISystemClient System { get; }
    public ISessionClient Session { get; }
    public IApiKeysClient ApiKeys { get; }
    public IChannelsClient Channels { get; }
    public IPostsClient Posts { get; }
    public IMediaClient Media { get; }
    public INoticesClient Notices { get; }
    public INotificationPreferencesClient NotificationPreferences { get; }
    public IAssistantClient Assistant { get; }
    public IMembersClient Members { get; }
    public IInvitationsClient Invitations { get; }
    public IBillingClient Billing { get; }
    public IAnalyticsClient Analytics { get; }
    public ITiktokClient Tiktok { get; }
    public IReviewClient Review { get; }
}
