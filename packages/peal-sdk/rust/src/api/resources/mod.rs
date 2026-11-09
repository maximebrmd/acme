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

use crate::{ApiError, ClientConfig};

pub mod analytics;
pub mod api_keys;
pub mod assistant;
pub mod billing;
pub mod channels;
pub mod invitations;
pub mod media;
pub mod members;
pub mod notices;
pub mod notification_preferences;
pub mod posts;
pub mod session;
pub mod system;
pub mod tiktok;
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
        })
    }
}

pub use analytics::AnalyticsClient;
pub use api_keys::ApiKeysClient;
pub use assistant::AssistantClient;
pub use billing::BillingClient;
pub use channels::ChannelsClient;
pub use invitations::InvitationsClient;
pub use media::MediaClient;
pub use members::MembersClient;
pub use notices::NoticesClient;
pub use notification_preferences::NotificationPreferencesClient;
pub use posts::PostsClient;
pub use session::SessionClient;
pub use system::SystemClient;
pub use tiktok::TiktokClient;
