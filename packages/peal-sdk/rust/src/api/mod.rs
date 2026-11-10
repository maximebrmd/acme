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
    AnalyticsClient, ApiKeysClient, AssistantClient, BillingClient, ChannelsClient,
    ConnectLinksClient, InvitationsClient, MediaClient, MembersClient, NoticesClient,
    NotificationPreferencesClient, PartnerAccountClient, PartnerClient, PealClient, PostsClient,
    SessionClient, SystemClient, TiktokClient, WebhooksClient,
};
pub use types::*;
