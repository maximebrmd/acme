pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WebhookFilterRefusedEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub field: WebhookFilterRefusedEncodedField,
}

impl WebhookFilterRefusedEncoded {
    pub fn builder() -> WebhookFilterRefusedEncodedBuilder {
        <WebhookFilterRefusedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookFilterRefusedEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    field: Option<WebhookFilterRefusedEncodedField>,
}

impl WebhookFilterRefusedEncodedBuilder {
    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
        self
    }

    pub fn field(mut self, value: WebhookFilterRefusedEncodedField) -> Self {
        self.field = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`WebhookFilterRefusedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`field`](WebhookFilterRefusedEncodedBuilder::field)
    pub fn build(self) -> Result<WebhookFilterRefusedEncoded, BuildError> {
        Ok(WebhookFilterRefusedEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            field: self
                .field
                .ok_or_else(|| BuildError::missing_field("field"))?,
        })
    }
}
