pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Channel {
    #[serde(rename = "avatarUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    #[serde(rename = "displayName")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(default)]
    pub handle: String,
    #[serde(default)]
    pub id: String,
    pub platform: Platform,
    pub status: ChannelStatus,
    #[serde(rename = "tokenExpiresAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_expires_at: Option<String>,
}

impl Channel {
    pub fn builder() -> ChannelBuilder {
        <ChannelBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelBuilder {
    avatar_url: Option<String>,
    display_name: Option<String>,
    handle: Option<String>,
    id: Option<String>,
    platform: Option<Platform>,
    status: Option<ChannelStatus>,
    token_expires_at: Option<String>,
}

impl ChannelBuilder {
    pub fn avatar_url(mut self, value: impl Into<String>) -> Self {
        self.avatar_url = Some(value.into());
        self
    }

    pub fn display_name(mut self, value: impl Into<String>) -> Self {
        self.display_name = Some(value.into());
        self
    }

    pub fn handle(mut self, value: impl Into<String>) -> Self {
        self.handle = Some(value.into());
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

    pub fn status(mut self, value: ChannelStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn token_expires_at(mut self, value: impl Into<String>) -> Self {
        self.token_expires_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Channel`].
    /// This method will fail if any of the following fields are not set:
    /// - [`handle`](ChannelBuilder::handle)
    /// - [`id`](ChannelBuilder::id)
    /// - [`platform`](ChannelBuilder::platform)
    /// - [`status`](ChannelBuilder::status)
    pub fn build(self) -> Result<Channel, BuildError> {
        Ok(Channel {
            avatar_url: self.avatar_url,
            display_name: self.display_name,
            handle: self
                .handle
                .ok_or_else(|| BuildError::missing_field("handle"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            token_expires_at: self.token_expires_at,
        })
    }
}
