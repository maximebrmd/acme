pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ReplyStatusConflictEncoded {
    #[serde(rename = "_tag")]
    pub tag: ReplyStatusConflictEncodedTag,
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
    status: Option<String>,
}

impl ReplyStatusConflictEncodedBuilder {
    pub fn tag(mut self, value: ReplyStatusConflictEncodedTag) -> Self {
        self.tag = Some(value);
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
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
