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
        Assistant = new AssistantClient(_client);
        Members = new MembersClient(_client);
        Invitations = new InvitationsClient(_client);
        Billing = new BillingClient(_client);
        Analytics = new AnalyticsClient(_client);
        Tiktok = new TiktokClient(_client);
        Capabilities = new CapabilitiesClient(_client);
        Lookups = new LookupsClient(_client);
        Webhooks = new WebhooksClient(_client);
        Inbox = new InboxClient(_client);
        Activity = new ActivityClient(_client);
        Partner = new PartnerClient(_client);
        PartnerAccount = new PartnerAccountClient(_client);
        ConnectLinks = new ConnectLinksClient(_client);
        Review = new ReviewClient(_client);
    }

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

    public IActivityClient Activity { get; }

    public IPartnerClient Partner { get; }

    public IPartnerAccountClient PartnerAccount { get; }

    public IConnectLinksClient ConnectLinks { get; }

    public IReviewClient Review { get; }
}
