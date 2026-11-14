pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ConnectSite {
    #[serde(default)]
    pub address: String,
    #[serde(rename = "applicationPassword")]
    #[serde(default)]
    pub application_password: String,
    pub platform: SitePlatform,
    #[serde(rename = "userName")]
    #[serde(default)]
    pub user_name: String,
}

impl ConnectSite {
    pub fn builder() -> ConnectSiteBuilder {
        <ConnectSiteBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ConnectSiteBuilder {
    address: Option<String>,
    application_password: Option<String>,
    platform: Option<SitePlatform>,
    user_name: Option<String>,
}

impl ConnectSiteBuilder {
    pub fn address(mut self, value: impl Into<String>) -> Self {
        self.address = Some(value.into());
        self
    }

    pub fn application_password(mut self, value: impl Into<String>) -> Self {
        self.application_password = Some(value.into());
        self
    }

    pub fn platform(mut self, value: SitePlatform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn user_name(mut self, value: impl Into<String>) -> Self {
        self.user_name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ConnectSite`].
    /// This method will fail if any of the following fields are not set:
    /// - [`address`](ConnectSiteBuilder::address)
    /// - [`application_password`](ConnectSiteBuilder::application_password)
    /// - [`platform`](ConnectSiteBuilder::platform)
    /// - [`user_name`](ConnectSiteBuilder::user_name)
    pub fn build(self) -> Result<ConnectSite, BuildError> {
        Ok(ConnectSite {
            address: self
                .address
                .ok_or_else(|| BuildError::missing_field("address"))?,
            application_password: self
                .application_password
                .ok_or_else(|| BuildError::missing_field("application_password"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            user_name: self
                .user_name
                .ok_or_else(|| BuildError::missing_field("user_name"))?,
        })
    }
}
