pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct MediaSourceUnreachableEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub reason: MediaSourceFailure,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<i64>,
}

impl MediaSourceUnreachableEncoded {
    pub fn builder() -> MediaSourceUnreachableEncodedBuilder {
        <MediaSourceUnreachableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaSourceUnreachableEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    reason: Option<MediaSourceFailure>,
    status: Option<i64>,
}

impl MediaSourceUnreachableEncodedBuilder {
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

    pub fn reason(mut self, value: MediaSourceFailure) -> Self {
        self.reason = Some(value);
        self
    }

    pub fn status(mut self, value: i64) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaSourceUnreachableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`reason`](MediaSourceUnreachableEncodedBuilder::reason)
    pub fn build(self) -> Result<MediaSourceUnreachableEncoded, BuildError> {
        Ok(MediaSourceUnreachableEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
            status: self.status,
        })
    }
}
