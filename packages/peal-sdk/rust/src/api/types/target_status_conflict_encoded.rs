pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TargetStatusConflictEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub status: PostTargetStatus,
}

impl TargetStatusConflictEncoded {
    pub fn builder() -> TargetStatusConflictEncodedBuilder {
        <TargetStatusConflictEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TargetStatusConflictEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    status: Option<PostTargetStatus>,
}

impl TargetStatusConflictEncodedBuilder {
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

    pub fn status(mut self, value: PostTargetStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TargetStatusConflictEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`status`](TargetStatusConflictEncodedBuilder::status)
    pub fn build(self) -> Result<TargetStatusConflictEncoded, BuildError> {
        Ok(TargetStatusConflictEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
