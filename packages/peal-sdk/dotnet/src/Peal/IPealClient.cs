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
    public ICapabilitiesClient Capabilities { get; }
    public ILookupsClient Lookups { get; }
    public IWebhooksClient Webhooks { get; }
    public IInboxClient Inbox { get; }
    public IAdsClient Ads { get; }
    public IActivityClient Activity { get; }
    public IPartnerClient Partner { get; }
    public IPartnerAccountClient PartnerAccount { get; }
    public IConnectLinksClient ConnectLinks { get; }
    public IReviewClient Review { get; }
    public ITagsClient Tags { get; }
    public ISignaturesClient Signatures { get; }
    public IChannelSetsClient ChannelSets { get; }
    public IQueuesClient Queues { get; }
    public IChannelDefaultsClient ChannelDefaults { get; }
}
