pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct CreatedConnectLink {
    pub link: ConnectLink,
    #[serde(default)]
    pub url: String,
}

impl CreatedConnectLink {
    pub fn builder() -> CreatedConnectLinkBuilder {
        <CreatedConnectLinkBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CreatedConnectLinkBuilder {
    link: Option<ConnectLink>,
    url: Option<String>,
}

impl CreatedConnectLinkBuilder {
    pub fn link(mut self, value: ConnectLink) -> Self {
        self.link = Some(value);
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CreatedConnectLink`].
    /// This method will fail if any of the following fields are not set:
    /// - [`link`](CreatedConnectLinkBuilder::link)
    /// - [`url`](CreatedConnectLinkBuilder::url)
    pub fn build(self) -> Result<CreatedConnectLink, BuildError> {
        Ok(CreatedConnectLink {
            link: self.link.ok_or_else(|| BuildError::missing_field("link"))?,
            url: self.url.ok_or_else(|| BuildError::missing_field("url"))?,
        })
    }
}
