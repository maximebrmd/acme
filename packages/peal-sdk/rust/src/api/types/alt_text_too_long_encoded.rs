pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AltTextTooLongEncoded {
    #[serde(rename = "_tag")]
    pub tag: AltTextTooLongEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "maxLength")]
    #[serde(default)]
    pub max_length: i64,
}

impl AltTextTooLongEncoded {
    pub fn builder() -> AltTextTooLongEncodedBuilder {
        <AltTextTooLongEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AltTextTooLongEncodedBuilder {
    tag: Option<AltTextTooLongEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    max_length: Option<i64>,
}

impl AltTextTooLongEncodedBuilder {
    pub fn tag(mut self, value: AltTextTooLongEncodedTag) -> Self {
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

    pub fn max_length(mut self, value: i64) -> Self {
        self.max_length = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AltTextTooLongEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](AltTextTooLongEncodedBuilder::tag)
    /// - [`max_length`](AltTextTooLongEncodedBuilder::max_length)
    pub fn build(self) -> Result<AltTextTooLongEncoded, BuildError> {
        Ok(AltTextTooLongEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            max_length: self
                .max_length
                .ok_or_else(|| BuildError::missing_field("max_length"))?,
        })
    }
}
