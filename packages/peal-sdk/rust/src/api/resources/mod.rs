//! Service clients and API endpoints
//!
//! This module contains client implementations for:
//!
//! - **system**
//! - **session**
//! - **apiKeys**
//! - **channels**
//! - **posts**
//! - **media**
//! - **notices**
//! - **notificationPreferences**
//! - **assistant**
//! - **members**
//! - **invitations**
//! - **billing**
//! - **analytics**
//! - **tiktok**
//! - **capabilities**
//! - **lookups**
//! - **webhooks**
//! - **activity**
//! - **partner**
//! - **partnerAccount**
//! - **connectLinks**
//! - **review**

use crate::{ApiError, ClientConfig};

pub mod activity;
pub mod analytics;
pub mod api_keys;
pub mod assistant;
pub mod billing;
pub mod capabilities;
pub mod channels;
pub mod connect_links;
pub mod invitations;
pub mod lookups;
pub mod media;
pub mod members;
pub mod notices;
pub mod notification_preferences;
pub mod partner;
pub mod partner_account;
pub mod posts;
pub mod review;
pub mod session;
pub mod system;
pub mod tiktok;
pub mod webhooks;
pub struct PealClient {
    pub config: ClientConfig,
    pub system: SystemClient,
    pub session: SessionClient,
    pub api_keys: ApiKeysClient,
    pub channels: ChannelsClient,
    pub posts: PostsClient,
    pub media: MediaClient,
    pub notices: NoticesClient,
    pub notification_preferences: NotificationPreferencesClient,
    pub assistant: AssistantClient,
    pub members: MembersClient,
    pub invitations: InvitationsClient,
    pub billing: BillingClient,
    pub analytics: AnalyticsClient,
    pub tiktok: TiktokClient,
    pub capabilities: CapabilitiesClient,
    pub lookups: LookupsClient,
    pub webhooks: WebhooksClient,
    pub activity: ActivityClient,
    pub partner: PartnerClient,
    pub partner_account: PartnerAccountClient,
    pub connect_links: ConnectLinksClient,
    pub review: ReviewClient,
}

impl PealClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            config: config.clone(),
            system: SystemClient::new(config.clone())?,
            session: SessionClient::new(config.clone())?,
            api_keys: ApiKeysClient::new(config.clone())?,
            channels: ChannelsClient::new(config.clone())?,
            posts: PostsClient::new(config.clone())?,
            media: MediaClient::new(config.clone())?,
            notices: NoticesClient::new(config.clone())?,
            notification_preferences: NotificationPreferencesClient::new(config.clone())?,
            assistant: AssistantClient::new(config.clone())?,
            members: MembersClient::new(config.clone())?,
            invitations: InvitationsClient::new(config.clone())?,
            billing: BillingClient::new(config.clone())?,
            analytics: AnalyticsClient::new(config.clone())?,
            tiktok: TiktokClient::new(config.clone())?,
            capabilities: CapabilitiesClient::new(config.clone())?,
            lookups: LookupsClient::new(config.clone())?,
            webhooks: WebhooksClient::new(config.clone())?,
            activity: ActivityClient::new(config.clone())?,
            partner: PartnerClient::new(config.clone())?,
            partner_account: PartnerAccountClient::new(config.clone())?,
            connect_links: ConnectLinksClient::new(config.clone())?,
            review: ReviewClient::new(config.clone())?,
        })
    }
}

pub use activity::ActivityClient;
pub use analytics::AnalyticsClient;
pub use api_keys::ApiKeysClient;
pub use assistant::AssistantClient;
pub use billing::BillingClient;
pub use capabilities::CapabilitiesClient;
pub use channels::ChannelsClient;
pub use connect_links::ConnectLinksClient;
pub use invitations::InvitationsClient;
pub use lookups::LookupsClient;
pub use media::MediaClient;
pub use members::MembersClient;
pub use notices::NoticesClient;
pub use notification_preferences::NotificationPreferencesClient;
pub use partner::PartnerClient;
pub use partner_account::PartnerAccountClient;
pub use posts::PostsClient;
pub use review::ReviewClient;
pub use session::SessionClient;
pub use system::SystemClient;
pub use tiktok::TiktokClient;
pub use webhooks::WebhooksClient;
