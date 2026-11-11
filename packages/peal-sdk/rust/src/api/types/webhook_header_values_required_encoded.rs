pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WebhookHeaderValuesRequiredEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

impl WebhookHeaderValuesRequiredEncoded {
    pub fn builder() -> WebhookHeaderValuesRequiredEncodedBuilder {
        <WebhookHeaderValuesRequiredEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookHeaderValuesRequiredEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
}

impl WebhookHeaderValuesRequiredEncodedBuilder {
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

    /// Consumes the builder and constructs a [`WebhookHeaderValuesRequiredEncoded`].
    pub fn build(self) -> Result<WebhookHeaderValuesRequiredEncoded, BuildError> {
        Ok(WebhookHeaderValuesRequiredEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
        })
    }
}
