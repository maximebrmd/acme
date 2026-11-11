pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TooManyWebhookSendsEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub allowed: i64,
    #[serde(rename = "retryAfterSeconds")]
    #[serde(default)]
    pub retry_after_seconds: i64,
}

impl TooManyWebhookSendsEncoded {
    pub fn builder() -> TooManyWebhookSendsEncodedBuilder {
        <TooManyWebhookSendsEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TooManyWebhookSendsEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    allowed: Option<i64>,
    retry_after_seconds: Option<i64>,
}

impl TooManyWebhookSendsEncodedBuilder {
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

    pub fn allowed(mut self, value: i64) -> Self {
        self.allowed = Some(value);
        self
    }

    pub fn retry_after_seconds(mut self, value: i64) -> Self {
        self.retry_after_seconds = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TooManyWebhookSendsEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`allowed`](TooManyWebhookSendsEncodedBuilder::allowed)
    /// - [`retry_after_seconds`](TooManyWebhookSendsEncodedBuilder::retry_after_seconds)
    pub fn build(self) -> Result<TooManyWebhookSendsEncoded, BuildError> {
        Ok(TooManyWebhookSendsEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            allowed: self
                .allowed
                .ok_or_else(|| BuildError::missing_field("allowed"))?,
            retry_after_seconds: self
                .retry_after_seconds
                .ok_or_else(|| BuildError::missing_field("retry_after_seconds"))?,
        })
    }
}
