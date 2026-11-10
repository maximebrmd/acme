pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UnsupportedMediaTypeEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "contentType")]
    #[serde(default)]
    pub content_type: String,
}

impl UnsupportedMediaTypeEncoded {
    pub fn builder() -> UnsupportedMediaTypeEncodedBuilder {
        <UnsupportedMediaTypeEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UnsupportedMediaTypeEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    content_type: Option<String>,
}

impl UnsupportedMediaTypeEncodedBuilder {
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

    pub fn content_type(mut self, value: impl Into<String>) -> Self {
        self.content_type = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`UnsupportedMediaTypeEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`content_type`](UnsupportedMediaTypeEncodedBuilder::content_type)
    pub fn build(self) -> Result<UnsupportedMediaTypeEncoded, BuildError> {
        Ok(UnsupportedMediaTypeEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            content_type: self
                .content_type
                .ok_or_else(|| BuildError::missing_field("content_type"))?,
        })
    }
}
