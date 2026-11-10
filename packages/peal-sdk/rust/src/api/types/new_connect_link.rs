pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct NewConnectLink {
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connection: Option<InstagramConnection>,
    #[serde(rename = "expiresInHours")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_in_hours: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale: Option<ConnectLinkLocale>,
    pub platform: Platform,
    #[serde(rename = "returnUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub return_url: Option<String>,
}

impl NewConnectLink {
    pub fn builder() -> NewConnectLinkBuilder {
        <NewConnectLinkBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewConnectLinkBuilder {
    channel_id: Option<String>,
    connection: Option<InstagramConnection>,
    expires_in_hours: Option<i64>,
    locale: Option<ConnectLinkLocale>,
    platform: Option<Platform>,
    return_url: Option<String>,
}

impl NewConnectLinkBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn connection(mut self, value: InstagramConnection) -> Self {
        self.connection = Some(value);
        self
    }

    pub fn expires_in_hours(mut self, value: i64) -> Self {
        self.expires_in_hours = Some(value);
        self
    }

    pub fn locale(mut self, value: ConnectLinkLocale) -> Self {
        self.locale = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn return_url(mut self, value: impl Into<String>) -> Self {
        self.return_url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewConnectLink`].
    /// This method will fail if any of the following fields are not set:
    /// - [`platform`](NewConnectLinkBuilder::platform)
    pub fn build(self) -> Result<NewConnectLink, BuildError> {
        Ok(NewConnectLink {
            channel_id: self.channel_id,
            connection: self.connection,
            expires_in_hours: self.expires_in_hours,
            locale: self.locale,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            return_url: self.return_url,
        })
    }
}
