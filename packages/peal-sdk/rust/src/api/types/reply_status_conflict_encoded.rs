pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ReplyStatusConflictEncoded {
    #[serde(rename = "_tag")]
    pub tag: ReplyStatusConflictEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub status: String,
}

impl ReplyStatusConflictEncoded {
    pub fn builder() -> ReplyStatusConflictEncodedBuilder {
        <ReplyStatusConflictEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReplyStatusConflictEncodedBuilder {
    tag: Option<ReplyStatusConflictEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    status: Option<String>,
}

impl ReplyStatusConflictEncodedBuilder {
    pub fn tag(mut self, value: ReplyStatusConflictEncodedTag) -> Self {
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

    pub fn status(mut self, value: impl Into<String>) -> Self {
        self.status = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ReplyStatusConflictEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ReplyStatusConflictEncodedBuilder::tag)
    /// - [`status`](ReplyStatusConflictEncodedBuilder::status)
    pub fn build(self) -> Result<ReplyStatusConflictEncoded, BuildError> {
        Ok(ReplyStatusConflictEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
