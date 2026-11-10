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
    ActivityClient, AnalyticsClient, ApiKeysClient, AssistantClient, BillingClient,
    CapabilitiesClient, ChannelsClient, ConnectLinksClient, InboxClient, InvitationsClient,
    LookupsClient, MediaClient, MembersClient, NoticesClient, NotificationPreferencesClient,
    PartnerAccountClient, PartnerClient, PealClient, PostsClient, ReviewClient, SessionClient,
    SystemClient, TiktokClient, WebhooksClient,
};
pub use types::*;
