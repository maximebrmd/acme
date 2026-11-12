pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ImageProviderKeyRequiredEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

impl ImageProviderKeyRequiredEncoded {
    pub fn builder() -> ImageProviderKeyRequiredEncodedBuilder {
        <ImageProviderKeyRequiredEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ImageProviderKeyRequiredEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
}

impl ImageProviderKeyRequiredEncodedBuilder {
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

    /// Consumes the builder and constructs a [`ImageProviderKeyRequiredEncoded`].
    pub fn build(self) -> Result<ImageProviderKeyRequiredEncoded, BuildError> {
        Ok(ImageProviderKeyRequiredEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
        })
    }
}
