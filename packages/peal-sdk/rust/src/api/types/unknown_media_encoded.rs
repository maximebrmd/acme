pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UnknownMediaEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "mediaIds")]
    #[serde(default)]
    pub media_ids: Vec<String>,
}

impl UnknownMediaEncoded {
    pub fn builder() -> UnknownMediaEncodedBuilder {
        <UnknownMediaEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UnknownMediaEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    media_ids: Option<Vec<String>>,
}

impl UnknownMediaEncodedBuilder {
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

    pub fn media_ids(mut self, value: Vec<String>) -> Self {
        self.media_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UnknownMediaEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`media_ids`](UnknownMediaEncodedBuilder::media_ids)
    pub fn build(self) -> Result<UnknownMediaEncoded, BuildError> {
        Ok(UnknownMediaEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            media_ids: self
                .media_ids
                .ok_or_else(|| BuildError::missing_field("media_ids"))?,
        })
    }
}
