pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ConnectLink {
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
    #[serde(rename = "connectedPlatforms")]
    #[serde(default)]
    pub connected_platforms: Vec<Platform>,
    #[serde(rename = "completedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(rename = "expiresAt")]
    #[serde(default)]
    pub expires_at: String,
    #[serde(rename = "failedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure: Option<HostedConnectFailure>,
    #[serde(default)]
    pub id: String,
    pub platform: Platform,
    #[serde(default)]
    pub platforms: Vec<Platform>,
    #[serde(rename = "returnUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub return_url: Option<String>,
    pub status: ConnectLinkStatus,
}

impl ConnectLink {
    pub fn builder() -> ConnectLinkBuilder {
        <ConnectLinkBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ConnectLinkBuilder {
    channel_id: Option<String>,
    channel_ids: Option<Vec<String>>,
    connected_platforms: Option<Vec<Platform>>,
    completed_at: Option<String>,
    created_at: Option<String>,
    expires_at: Option<String>,
    failed_at: Option<String>,
    failure: Option<HostedConnectFailure>,
    id: Option<String>,
    platform: Option<Platform>,
    platforms: Option<Vec<Platform>>,
    return_url: Option<String>,
    status: Option<ConnectLinkStatus>,
}

impl ConnectLinkBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    pub fn connected_platforms(mut self, value: Vec<Platform>) -> Self {
        self.connected_platforms = Some(value);
        self
    }

    pub fn completed_at(mut self, value: impl Into<String>) -> Self {
        self.completed_at = Some(value.into());
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn expires_at(mut self, value: impl Into<String>) -> Self {
        self.expires_at = Some(value.into());
        self
    }

    pub fn failed_at(mut self, value: impl Into<String>) -> Self {
        self.failed_at = Some(value.into());
        self
    }

    pub fn failure(mut self, value: HostedConnectFailure) -> Self {
        self.failure = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn platforms(mut self, value: Vec<Platform>) -> Self {
        self.platforms = Some(value);
        self
    }

    pub fn return_url(mut self, value: impl Into<String>) -> Self {
        self.return_url = Some(value.into());
        self
    }

    pub fn status(mut self, value: ConnectLinkStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ConnectLink`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_ids`](ConnectLinkBuilder::channel_ids)
    /// - [`connected_platforms`](ConnectLinkBuilder::connected_platforms)
    /// - [`created_at`](ConnectLinkBuilder::created_at)
    /// - [`expires_at`](ConnectLinkBuilder::expires_at)
    /// - [`id`](ConnectLinkBuilder::id)
    /// - [`platform`](ConnectLinkBuilder::platform)
    /// - [`platforms`](ConnectLinkBuilder::platforms)
    /// - [`status`](ConnectLinkBuilder::status)
    pub fn build(self) -> Result<ConnectLink, BuildError> {
        Ok(ConnectLink {
            channel_id: self.channel_id,
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
            connected_platforms: self
                .connected_platforms
                .ok_or_else(|| BuildError::missing_field("connected_platforms"))?,
            completed_at: self.completed_at,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            expires_at: self
                .expires_at
                .ok_or_else(|| BuildError::missing_field("expires_at"))?,
            failed_at: self.failed_at,
            failure: self.failure,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            platforms: self
                .platforms
                .ok_or_else(|| BuildError::missing_field("platforms"))?,
            return_url: self.return_url,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
