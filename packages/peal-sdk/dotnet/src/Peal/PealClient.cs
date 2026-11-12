using Peal.Core;

namespace Peal;

public partial class PealClient : IPealClient
{
    private readonly RawClient _client;

    public PealClient(string token, ClientOptions? clientOptions = null)
    {
        clientOptions ??= new ClientOptions();
        var platformHeaders = new Headers(
            new Dictionary<string, string>()
            {
                { "X-Fern-Language", "C#" },
                { "X-Fern-SDK-Name", "Peal" },
                { "X-Fern-SDK-Version", global::Peal.Version.Current },
            }
        );
        foreach (var header in platformHeaders)
        {
            if (!clientOptions.Headers.ContainsKey(header.Key))
            {
                clientOptions.Headers[header.Key] = header.Value;
            }
        }
        var clientOptionsWithAuth = clientOptions.Clone();
        var authHeaders = new Headers(
            new Dictionary<string, string>() { { "Authorization", $"Bearer {token}" } }
        );
        foreach (var header in authHeaders)
        {
            clientOptionsWithAuth.Headers[header.Key] = header.Value;
        }
        _client = new RawClient(clientOptionsWithAuth);
        System = new SystemClient(_client);
        Session = new SessionClient(_client);
        ApiKeys = new ApiKeysClient(_client);
        Channels = new ChannelsClient(_client);
        Posts = new PostsClient(_client);
        Media = new MediaClient(_client);
        Notices = new NoticesClient(_client);
        NotificationPreferences = new NotificationPreferencesClient(_client);
        Overview = new OverviewClient(_client);
        Assistant = new AssistantClient(_client);
        Members = new MembersClient(_client);
        Invitations = new InvitationsClient(_client);
        Billing = new BillingClient(_client);
        Usage = new UsageClient(_client);
        Analytics = new AnalyticsClient(_client);
        Tiktok = new TiktokClient(_client);
        Capabilities = new CapabilitiesClient(_client);
        Lookups = new LookupsClient(_client);
        Webhooks = new WebhooksClient(_client);
        Inbox = new InboxClient(_client);
        Ads = new AdsClient(_client);
        Activity = new ActivityClient(_client);
        Partner = new PartnerClient(_client);
        PartnerUsage = new PartnerUsageClient(_client);
        PartnerAccount = new PartnerAccountClient(_client);
        ConnectLinks = new ConnectLinksClient(_client);
        Review = new ReviewClient(_client);
        Tags = new TagsClient(_client);
        Signatures = new SignaturesClient(_client);
        ChannelSets = new ChannelSetsClient(_client);
        Queues = new QueuesClient(_client);
        Recycling = new RecyclingClient(_client);
        Feeds = new FeedsClient(_client);
        ChannelDefaults = new ChannelDefaultsClient(_client);
        ShortLinks = new ShortLinksClient(_client);
    }

    public ISystemClient System { get; }

    public ISessionClient Session { get; }

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
