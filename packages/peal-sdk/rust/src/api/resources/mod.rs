//! Service clients and API endpoints
//!
//! This module contains client implementations for:
//!
//! - **system**
//! - **session**
//! - **credential**
//! - **apiKeys**
//! - **channels**
//! - **posts**
//! - **articles**
//! - **media**
//! - **notices**
//! - **notificationPreferences**
//! - **overview**
//! - **assistant**
//! - **members**
//! - **invitations**
//! - **billing**
//! - **usage**
//! - **analytics**
//! - **tiktok**
//! - **capabilities**
//! - **lookups**
//! - **webhooks**
//! - **inbox**
//! - **inboxReviews**
//! - **ads**
//! - **activity**
//! - **partner**
//! - **partnerUsage**
//! - **partnerAccount**
//! - **connectLinks**
//! - **review**
//! - **tags**
//! - **signatures**
//! - **channelSets**
//! - **queues**
//! - **recycling**
//! - **feeds**
//! - **channelDefaults**
//! - **shortLinks**

use crate::{ApiError, ClientConfig};

pub mod activity;
pub mod ads;
pub mod analytics;
pub mod api_keys;
pub mod articles;
pub mod assistant;
pub mod billing;
pub mod capabilities;
pub mod channel_defaults;
pub mod channel_sets;
pub mod channels;
pub mod connect_links;
pub mod credential;
pub mod feeds;
pub mod inbox;
pub mod inbox_reviews;
pub mod invitations;
pub mod lookups;
pub mod media;
pub mod members;
pub mod notices;
pub mod notification_preferences;
pub mod overview;
pub mod partner;
pub mod partner_account;
pub mod partner_usage;
pub mod posts;
pub mod queues;
pub mod recycling;
pub mod review;
pub mod session;
pub mod short_links;
pub mod signatures;
pub mod system;
pub mod tags;
pub mod tiktok;
pub mod usage;
pub mod webhooks;
pub struct PealClient {
    pub config: ClientConfig,
    pub system: SystemClient,
    pub session: SessionClient,
    pub credential: CredentialClient,
    pub api_keys: ApiKeysClient,
    pub channels: ChannelsClient,
    pub posts: PostsClient,
    pub articles: ArticlesClient,
    pub media: MediaClient,
    pub notices: NoticesClient,
    pub notification_preferences: NotificationPreferencesClient,
    pub overview: OverviewClient,
    pub assistant: AssistantClient,
    pub members: MembersClient,
    pub invitations: InvitationsClient,
    pub billing: BillingClient,
    pub usage: UsageClient,
    pub analytics: AnalyticsClient,
    pub tiktok: TiktokClient,
    pub capabilities: CapabilitiesClient,
    pub lookups: LookupsClient,
    pub webhooks: WebhooksClient,
    pub inbox: InboxClient,
    pub inbox_reviews: InboxReviewsClient,
    pub ads: AdsClient,
    pub activity: ActivityClient,
    pub partner: PartnerClient,
    pub partner_usage: PartnerUsageClient,
    pub partner_account: PartnerAccountClient,
    pub connect_links: ConnectLinksClient,
    pub review: ReviewClient,
    pub tags: TagsClient,
    pub signatures: SignaturesClient,
    pub channel_sets: ChannelSetsClient,
    pub queues: QueuesClient,
    pub recycling: RecyclingClient,
    pub feeds: FeedsClient,
    pub channel_defaults: ChannelDefaultsClient,
    pub short_links: ShortLinksClient,
}

impl PealClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            config: config.clone(),
            system: SystemClient::new(config.clone())?,
            session: SessionClient::new(config.clone())?,
            credential: CredentialClient::new(config.clone())?,
            api_keys: ApiKeysClient::new(config.clone())?,
            channels: ChannelsClient::new(config.clone())?,
            posts: PostsClient::new(config.clone())?,
            articles: ArticlesClient::new(config.clone())?,
            media: MediaClient::new(config.clone())?,
            notices: NoticesClient::new(config.clone())?,
            notification_preferences: NotificationPreferencesClient::new(config.clone())?,
            overview: OverviewClient::new(config.clone())?,
            assistant: AssistantClient::new(config.clone())?,
            members: MembersClient::new(config.clone())?,
            invitations: InvitationsClient::new(config.clone())?,
            billing: BillingClient::new(config.clone())?,
            usage: UsageClient::new(config.clone())?,
            analytics: AnalyticsClient::new(config.clone())?,
            tiktok: TiktokClient::new(config.clone())?,
            capabilities: CapabilitiesClient::new(config.clone())?,
            lookups: LookupsClient::new(config.clone())?,
            webhooks: WebhooksClient::new(config.clone())?,
            inbox: InboxClient::new(config.clone())?,
            inbox_reviews: InboxReviewsClient::new(config.clone())?,
            ads: AdsClient::new(config.clone())?,
            activity: ActivityClient::new(config.clone())?,
            partner: PartnerClient::new(config.clone())?,
            partner_usage: PartnerUsageClient::new(config.clone())?,
            partner_account: PartnerAccountClient::new(config.clone())?,
            connect_links: ConnectLinksClient::new(config.clone())?,
            review: ReviewClient::new(config.clone())?,
            tags: TagsClient::new(config.clone())?,
            signatures: SignaturesClient::new(config.clone())?,
            channel_sets: ChannelSetsClient::new(config.clone())?,
            queues: QueuesClient::new(config.clone())?,
            recycling: RecyclingClient::new(config.clone())?,
            feeds: FeedsClient::new(config.clone())?,
            channel_defaults: ChannelDefaultsClient::new(config.clone())?,
            short_links: ShortLinksClient::new(config.clone())?,
        })
    }
}

pub use activity::ActivityClient;
pub use ads::AdsClient;
pub use analytics::AnalyticsClient;
pub use api_keys::ApiKeysClient;
pub use articles::ArticlesClient;
pub use assistant::AssistantClient;
pub use billing::BillingClient;
pub use capabilities::CapabilitiesClient;
pub use channel_defaults::ChannelDefaultsClient;
pub use channel_sets::ChannelSetsClient;
pub use channels::ChannelsClient;
pub use connect_links::ConnectLinksClient;
pub use credential::CredentialClient;
pub use feeds::FeedsClient;
pub use inbox::InboxClient;
pub use inbox_reviews::InboxReviewsClient;
pub use invitations::InvitationsClient;
pub use lookups::LookupsClient;
pub use media::MediaClient;
pub use members::MembersClient;
pub use notices::NoticesClient;
pub use notification_preferences::NotificationPreferencesClient;
pub use overview::OverviewClient;
pub use partner::PartnerClient;
pub use partner_account::PartnerAccountClient;
pub use partner_usage::PartnerUsageClient;
pub use posts::PostsClient;
pub use queues::QueuesClient;
pub use recycling::RecyclingClient;
pub use review::ReviewClient;
pub use session::SessionClient;
pub use short_links::ShortLinksClient;
pub use signatures::SignaturesClient;
pub use system::SystemClient;
pub use tags::TagsClient;
pub use tiktok::TiktokClient;
pub use usage::UsageClient;
pub use webhooks::WebhooksClient;
