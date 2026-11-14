pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SetMessageApplicationInboxMessagesRequest {
    #[serde(default)]
    pub allowed: bool,
    #[serde(rename = "clientId")]
    #[serde(default)]
    pub client_id: String,
}

impl SetMessageApplicationInboxMessagesRequest {
    pub fn builder() -> SetMessageApplicationInboxMessagesRequestBuilder {
        <SetMessageApplicationInboxMessagesRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SetMessageApplicationInboxMessagesRequestBuilder {
    allowed: Option<bool>,
    client_id: Option<String>,
}

impl SetMessageApplicationInboxMessagesRequestBuilder {
    pub fn allowed(mut self, value: bool) -> Self {
        self.allowed = Some(value);
        self
    }

    pub fn client_id(mut self, value: impl Into<String>) -> Self {
        self.client_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`SetMessageApplicationInboxMessagesRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`allowed`](SetMessageApplicationInboxMessagesRequestBuilder::allowed)
    /// - [`client_id`](SetMessageApplicationInboxMessagesRequestBuilder::client_id)
    pub fn build(self) -> Result<SetMessageApplicationInboxMessagesRequest, BuildError> {
        Ok(SetMessageApplicationInboxMessagesRequest {
            allowed: self
                .allowed
                .ok_or_else(|| BuildError::missing_field("allowed"))?,
            client_id: self
                .client_id
                .ok_or_else(|| BuildError::missing_field("client_id"))?,
        })
    }
}
