pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxMessageApplication {
    #[serde(rename = "clientId")]
    #[serde(default)]
    pub client_id: String,
    #[serde(rename = "grantedAt")]
    #[serde(default)]
    pub granted_at: String,
    #[serde(rename = "grantedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub granted_by: Option<String>,
}

impl InboxMessageApplication {
    pub fn builder() -> InboxMessageApplicationBuilder {
        <InboxMessageApplicationBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxMessageApplicationBuilder {
    client_id: Option<String>,
    granted_at: Option<String>,
    granted_by: Option<String>,
}

impl InboxMessageApplicationBuilder {
    pub fn client_id(mut self, value: impl Into<String>) -> Self {
        self.client_id = Some(value.into());
        self
    }

    pub fn granted_at(mut self, value: impl Into<String>) -> Self {
        self.granted_at = Some(value.into());
        self
    }

    pub fn granted_by(mut self, value: impl Into<String>) -> Self {
        self.granted_by = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxMessageApplication`].
    /// This method will fail if any of the following fields are not set:
    /// - [`client_id`](InboxMessageApplicationBuilder::client_id)
    /// - [`granted_at`](InboxMessageApplicationBuilder::granted_at)
    pub fn build(self) -> Result<InboxMessageApplication, BuildError> {
        Ok(InboxMessageApplication {
            client_id: self
                .client_id
                .ok_or_else(|| BuildError::missing_field("client_id"))?,
            granted_at: self
                .granted_at
                .ok_or_else(|| BuildError::missing_field("granted_at"))?,
            granted_by: self.granted_by,
        })
    }
}
