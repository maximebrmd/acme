pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct MediaSourceUnreachableEncoded {
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
    reason: Option<MediaSourceFailure>,
    status: Option<i64>,
}

impl MediaSourceUnreachableEncodedBuilder {
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
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
            status: self.status,
        })
    }
}
