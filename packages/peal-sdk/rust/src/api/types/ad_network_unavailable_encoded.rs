pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AdNetworkUnavailableEncoded {
    #[serde(rename = "_tag")]
    pub tag: AdNetworkUnavailableEncodedTag,
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

impl AdNetworkUnavailableEncoded {
    pub fn builder() -> AdNetworkUnavailableEncodedBuilder {
        <AdNetworkUnavailableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdNetworkUnavailableEncodedBuilder {
    tag: Option<AdNetworkUnavailableEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    retry_after_seconds: Option<i64>,
}

impl AdNetworkUnavailableEncodedBuilder {
    pub fn tag(mut self, value: AdNetworkUnavailableEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

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

    /// Consumes the builder and constructs a [`AdNetworkUnavailableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](AdNetworkUnavailableEncodedBuilder::tag)
    pub fn build(self) -> Result<AdNetworkUnavailableEncoded, BuildError> {
        Ok(AdNetworkUnavailableEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            retry_after_seconds: self.retry_after_seconds,
        })
    }
}
