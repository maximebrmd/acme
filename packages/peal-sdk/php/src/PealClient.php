<?php

namespace Peal;

use Peal\System\SystemClient;
use Peal\Session\SessionClient;
use Peal\ApiKeys\ApiKeysClient;
use Peal\Channels\ChannelsClient;
use Peal\Posts\PostsClient;
use Peal\Media\MediaClient;
use Peal\Notices\NoticesClient;
use Peal\NotificationPreferences\NotificationPreferencesClient;
use Peal\Assistant\AssistantClient;
use Peal\Members\MembersClient;
use Peal\Invitations\InvitationsClient;
use Peal\Billing\BillingClient;
use Peal\Analytics\AnalyticsClient;
use Peal\Tiktok\TiktokClient;
use Peal\Capabilities\CapabilitiesClient;
use Peal\Lookups\LookupsClient;
use Peal\Webhooks\WebhooksClient;
use Peal\Activity\ActivityClient;
use Peal\Partner\PartnerClient;
use Peal\PartnerAccount\PartnerAccountClient;
use Peal\ConnectLinks\ConnectLinksClient;
use Peal\Review\ReviewClient;
use Peal\Tags\TagsClient;
use Peal\Signatures\SignaturesClient;
use Peal\ChannelSets\ChannelSetsClient;
use Peal\ChannelDefaults\ChannelDefaultsClient;
use Psr\Http\Client\ClientInterface;
use Peal\Core\Client\RawClient;

class PealClient
{
    /**
     * @var SystemClient $system
     */
    public SystemClient $system;

    /**
     * @var SessionClient $session
     */
    public SessionClient $session;

    /**
     * @var ApiKeysClient $apiKeys
     */
    public ApiKeysClient $apiKeys;

    /**
     * @var ChannelsClient $channels
     */
    public ChannelsClient $channels;

    /**
     * @var PostsClient $posts
     */
    public PostsClient $posts;

    /**
     * @var MediaClient $media
     */
    public MediaClient $media;

    /**
     * @var NoticesClient $notices
     */
    public NoticesClient $notices;

    /**
     * @var NotificationPreferencesClient $notificationPreferences
     */
    public NotificationPreferencesClient $notificationPreferences;

    /**
     * @var AssistantClient $assistant
     */
    public AssistantClient $assistant;

    /**
     * @var MembersClient $members
     */
    public MembersClient $members;

    /**
     * @var InvitationsClient $invitations
     */
    public InvitationsClient $invitations;

    /**
     * @var BillingClient $billing
     */
    public BillingClient $billing;

    /**
     * @var AnalyticsClient $analytics
     */
    public AnalyticsClient $analytics;

    /**
     * @var TiktokClient $tiktok
     */
    public TiktokClient $tiktok;

    /**
     * @var CapabilitiesClient $capabilities
     */
    public CapabilitiesClient $capabilities;

    /**
     * @var LookupsClient $lookups
     */
    public LookupsClient $lookups;

    /**
     * @var WebhooksClient $webhooks
     */
    public WebhooksClient $webhooks;

    /**
     * @var ActivityClient $activity
     */
    public ActivityClient $activity;

    /**
     * @var PartnerClient $partner
     */
    public PartnerClient $partner;

    /**
     * @var PartnerAccountClient $partnerAccount
     */
    public PartnerAccountClient $partnerAccount;

    /**
     * @var ConnectLinksClient $connectLinks
     */
    public ConnectLinksClient $connectLinks;

    /**
     * @var ReviewClient $review
     */
    public ReviewClient $review;

    /**
     * @var TagsClient $tags
     */
    public TagsClient $tags;

    /**
     * @var SignaturesClient $signatures
     */
    public SignaturesClient $signatures;

    /**
     * @var ChannelSetsClient $channelSets
     */
    public ChannelSetsClient $channelSets;

    /**
     * @var ChannelDefaultsClient $channelDefaults
     */
    public ChannelDefaultsClient $channelDefaults;

    /**
     * @var array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options @phpstan-ignore-next-line Property is used in endpoint methods via HttpEndpointGenerator
     */
    private array $options;

    /**
     * @var RawClient $client
     */
    private RawClient $client;

    /**
     * @param ?string $token The token to use for authentication.
     * @param ?array{
     *   baseUrl?: string,
     *   client?: ClientInterface,
     *   maxRetries?: int,
     *   timeout?: float,
     *   headers?: array<string, string>,
     * } $options
     */
    public function __construct(
        ?string $token = null,
        ?array $options = null,
    ) {
        $defaultHeaders = [
            'X-Fern-Language' => 'PHP',
            'X-Fern-SDK-Name' => 'Peal',
            'X-Fern-SDK-Version' => '0.3.0',
            'User-Agent' => 'peal-social/peal/0.3.0',
        ];
        if ($token != null) {
            $defaultHeaders['Authorization'] = "Bearer $token";
        }

        $this->options = $options ?? [];

        $this->options['headers'] = array_merge(
            $defaultHeaders,
            $this->options['headers'] ?? [],
        );

        $this->client = new RawClient(
            options: $this->options,
        );

        $this->system = new SystemClient($this->client, $this->options);
        $this->session = new SessionClient($this->client, $this->options);
        $this->apiKeys = new ApiKeysClient($this->client, $this->options);
        $this->channels = new ChannelsClient($this->client, $this->options);
        $this->posts = new PostsClient($this->client, $this->options);
        $this->media = new MediaClient($this->client, $this->options);
        $this->notices = new NoticesClient($this->client, $this->options);
        $this->notificationPreferences = new NotificationPreferencesClient($this->client, $this->options);
        $this->assistant = new AssistantClient($this->client, $this->options);
        $this->members = new MembersClient($this->client, $this->options);
        $this->invitations = new InvitationsClient($this->client, $this->options);
        $this->billing = new BillingClient($this->client, $this->options);
        $this->analytics = new AnalyticsClient($this->client, $this->options);
        $this->tiktok = new TiktokClient($this->client, $this->options);
        $this->capabilities = new CapabilitiesClient($this->client, $this->options);
        $this->lookups = new LookupsClient($this->client, $this->options);
        $this->webhooks = new WebhooksClient($this->client, $this->options);
        $this->activity = new ActivityClient($this->client, $this->options);
        $this->partner = new PartnerClient($this->client, $this->options);
        $this->partnerAccount = new PartnerAccountClient($this->client, $this->options);
        $this->connectLinks = new ConnectLinksClient($this->client, $this->options);
        $this->review = new ReviewClient($this->client, $this->options);
        $this->tags = new TagsClient($this->client, $this->options);
        $this->signatures = new SignaturesClient($this->client, $this->options);
        $this->channelSets = new ChannelSetsClient($this->client, $this->options);
        $this->channelDefaults = new ChannelDefaultsClient($this->client, $this->options);
    }
}
