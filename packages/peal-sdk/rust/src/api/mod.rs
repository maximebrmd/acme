//! API client and types for the Peal API
//!
//! This module contains all the API definitions including request/response types
//! and client implementations for interacting with the API.
//!
//! ## Modules
//!
//! - [`resources`] - Service clients and endpoints
//! - [`types`] - Request, response, and model types

pub mod resources;
pub mod types;

pub use resources::{
    ActivityClient, AdsClient, AnalyticsClient, ApiKeysClient, AssistantClient, BillingClient,
    CapabilitiesClient, ChannelDefaultsClient, ChannelSetsClient, ChannelsClient,
    ConnectLinksClient, InboxClient, InvitationsClient, LookupsClient, MediaClient, MembersClient,
    NoticesClient, NotificationPreferencesClient, PartnerAccountClient, PartnerClient,
    PartnerUsageClient, PealClient, PostsClient, QueuesClient, RecyclingClient, ReviewClient,
    SessionClient, ShortLinksClient, SignaturesClient, SystemClient, TagsClient, TiktokClient,
    UsageClient, WebhooksClient,
};
pub use types::*;
