pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TooManyFeedsEncoded {
    #[serde(rename = "_tag")]
    pub tag: TooManyFeedsEncodedTag,
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

impl TooManyFeedsEncoded {
    pub fn builder() -> TooManyFeedsEncodedBuilder {
        <TooManyFeedsEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TooManyFeedsEncodedBuilder {
    tag: Option<TooManyFeedsEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    allowed: Option<i64>,
}

impl TooManyFeedsEncodedBuilder {
    pub fn tag(mut self, value: TooManyFeedsEncodedTag) -> Self {
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

    /// Consumes the builder and constructs a [`TooManyFeedsEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](TooManyFeedsEncodedBuilder::tag)
    /// - [`allowed`](TooManyFeedsEncodedBuilder::allowed)
    pub fn build(self) -> Result<TooManyFeedsEncoded, BuildError> {
        Ok(TooManyFeedsEncoded {
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
