pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct UploadRejectedEncoded {
    #[serde(rename = "_tag")]
    pub tag: UploadRejectedEncodedTag,
    pub reason: RejectionReason,
}

impl UploadRejectedEncoded {
    pub fn builder() -> UploadRejectedEncodedBuilder {
        <UploadRejectedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UploadRejectedEncodedBuilder {
    tag: Option<UploadRejectedEncodedTag>,
    reason: Option<RejectionReason>,
}

impl UploadRejectedEncodedBuilder {
    pub fn tag(mut self, value: UploadRejectedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn reason(mut self, value: RejectionReason) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UploadRejectedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](UploadRejectedEncodedBuilder::tag)
    /// - [`reason`](UploadRejectedEncodedBuilder::reason)
    pub fn build(self) -> Result<UploadRejectedEncoded, BuildError> {
        Ok(UploadRejectedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
