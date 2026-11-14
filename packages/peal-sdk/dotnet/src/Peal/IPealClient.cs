namespace Peal;

public partial interface IPealClient
{
    public ISystemClient System { get; }
    public ISessionClient Session { get; }
    public ICredentialClient Credential { get; }
    public IApiKeysClient ApiKeys { get; }
    public IChannelsClient Channels { get; }
    public IPostsClient Posts { get; }
    public IMediaClient Media { get; }
    public INoticesClient Notices { get; }
    public INotificationPreferencesClient NotificationPreferences { get; }
    public IOverviewClient Overview { get; }
    public IAssistantClient Assistant { get; }
    public IMembersClient Members { get; }
    public IInvitationsClient Invitations { get; }
    public IBillingClient Billing { get; }
    public IUsageClient Usage { get; }
    public IAnalyticsClient Analytics { get; }
    public ITiktokClient Tiktok { get; }
    public ICapabilitiesClient Capabilities { get; }
    public ILookupsClient Lookups { get; }
    public IWebhooksClient Webhooks { get; }
    public IInboxClient Inbox { get; }
    public IInboxReviewsClient InboxReviews { get; }
    public IInboxMessagesClient InboxMessages { get; }
    public IAdsClient Ads { get; }
    public IActivityClient Activity { get; }
    public IPartnerClient Partner { get; }
    public IPartnerUsageClient PartnerUsage { get; }
    public IPartnerAccountClient PartnerAccount { get; }
    public IConnectLinksClient ConnectLinks { get; }
    public IReviewClient Review { get; }
    public ITagsClient Tags { get; }
    public ISignaturesClient Signatures { get; }
    public IChannelSetsClient ChannelSets { get; }
    public IQueuesClient Queues { get; }
    public IRecyclingClient Recycling { get; }
    public IFeedsClient Feeds { get; }
    public IChannelDefaultsClient ChannelDefaults { get; }
    public IShortLinksClient ShortLinks { get; }
}
