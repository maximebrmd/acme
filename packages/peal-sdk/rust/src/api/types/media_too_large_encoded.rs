pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct MediaTooLargeEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "byteSize")]
    #[serde(default)]
    pub byte_size: i64,
    pub kind: MediaTooLargeEncodedKind,
    #[serde(rename = "maxByteSize")]
    #[serde(default)]
    pub max_byte_size: i64,
}

impl MediaTooLargeEncoded {
    pub fn builder() -> MediaTooLargeEncodedBuilder {
        <MediaTooLargeEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaTooLargeEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    byte_size: Option<i64>,
    kind: Option<MediaTooLargeEncodedKind>,
    max_byte_size: Option<i64>,
}

impl MediaTooLargeEncodedBuilder {
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

    pub fn byte_size(mut self, value: i64) -> Self {
        self.byte_size = Some(value);
        self
    }

    pub fn kind(mut self, value: MediaTooLargeEncodedKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn max_byte_size(mut self, value: i64) -> Self {
        self.max_byte_size = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaTooLargeEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`byte_size`](MediaTooLargeEncodedBuilder::byte_size)
    /// - [`kind`](MediaTooLargeEncodedBuilder::kind)
    /// - [`max_byte_size`](MediaTooLargeEncodedBuilder::max_byte_size)
    pub fn build(self) -> Result<MediaTooLargeEncoded, BuildError> {
        Ok(MediaTooLargeEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            byte_size: self
                .byte_size
                .ok_or_else(|| BuildError::missing_field("byte_size"))?,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
            max_byte_size: self
                .max_byte_size
                .ok_or_else(|| BuildError::missing_field("max_byte_size"))?,
        })
    }
}
