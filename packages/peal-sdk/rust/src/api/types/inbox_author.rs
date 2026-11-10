pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxAuthor {
    #[serde(rename = "displayName")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(default)]
    pub handle: String,
    #[serde(rename = "platformId")]
    #[serde(default)]
    pub platform_id: String,
}

impl InboxAuthor {
    pub fn builder() -> InboxAuthorBuilder {
        <InboxAuthorBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxAuthorBuilder {
    display_name: Option<String>,
    handle: Option<String>,
    platform_id: Option<String>,
}

impl InboxAuthorBuilder {
    pub fn display_name(mut self, value: impl Into<String>) -> Self {
        self.display_name = Some(value.into());
        self
    }

    pub fn handle(mut self, value: impl Into<String>) -> Self {
        self.handle = Some(value.into());
        self
    }

    pub fn platform_id(mut self, value: impl Into<String>) -> Self {
        self.platform_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxAuthor`].
    /// This method will fail if any of the following fields are not set:
    /// - [`handle`](InboxAuthorBuilder::handle)
    /// - [`platform_id`](InboxAuthorBuilder::platform_id)
    pub fn build(self) -> Result<InboxAuthor, BuildError> {
        Ok(InboxAuthor {
            display_name: self.display_name,
            handle: self
                .handle
                .ok_or_else(|| BuildError::missing_field("handle"))?,
            platform_id: self
                .platform_id
                .ok_or_else(|| BuildError::missing_field("platform_id"))?,
        })
    }
}
