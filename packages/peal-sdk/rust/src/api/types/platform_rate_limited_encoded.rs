pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PlatformRateLimitedEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "retryAfterSeconds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_after_seconds: Option<i64>,
}

impl PlatformRateLimitedEncoded {
    pub fn builder() -> PlatformRateLimitedEncodedBuilder {
        <PlatformRateLimitedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlatformRateLimitedEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    retry_after_seconds: Option<i64>,
}

impl PlatformRateLimitedEncodedBuilder {
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

    pub fn retry_after_seconds(mut self, value: i64) -> Self {
        self.retry_after_seconds = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlatformRateLimitedEncoded`].
    pub fn build(self) -> Result<PlatformRateLimitedEncoded, BuildError> {
        Ok(PlatformRateLimitedEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            retry_after_seconds: self.retry_after_seconds,
        })
    }
}
