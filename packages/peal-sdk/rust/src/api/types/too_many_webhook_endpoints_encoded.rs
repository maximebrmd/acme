pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TooManyWebhookEndpointsEncoded {
    #[serde(rename = "_tag")]
    pub tag: TooManyWebhookEndpointsEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub allowed: i64,
}

impl TooManyWebhookEndpointsEncoded {
    pub fn builder() -> TooManyWebhookEndpointsEncodedBuilder {
        <TooManyWebhookEndpointsEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TooManyWebhookEndpointsEncodedBuilder {
    tag: Option<TooManyWebhookEndpointsEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    allowed: Option<i64>,
}

impl TooManyWebhookEndpointsEncodedBuilder {
    pub fn tag(mut self, value: TooManyWebhookEndpointsEncodedTag) -> Self {
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

    pub fn allowed(mut self, value: i64) -> Self {
        self.allowed = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TooManyWebhookEndpointsEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](TooManyWebhookEndpointsEncodedBuilder::tag)
    /// - [`allowed`](TooManyWebhookEndpointsEncodedBuilder::allowed)
    pub fn build(self) -> Result<TooManyWebhookEndpointsEncoded, BuildError> {
        Ok(TooManyWebhookEndpointsEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            allowed: self
                .allowed
                .ok_or_else(|| BuildError::missing_field("allowed"))?,
        })
    }
}
