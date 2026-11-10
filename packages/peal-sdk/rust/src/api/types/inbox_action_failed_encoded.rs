pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxActionFailedEncoded {
    #[serde(rename = "_tag")]
    pub tag: InboxActionFailedEncodedTag,
    #[serde(default)]
    pub reason: String,
}

impl InboxActionFailedEncoded {
    pub fn builder() -> InboxActionFailedEncodedBuilder {
        <InboxActionFailedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxActionFailedEncodedBuilder {
    tag: Option<InboxActionFailedEncodedTag>,
    reason: Option<String>,
}

impl InboxActionFailedEncodedBuilder {
    pub fn tag(mut self, value: InboxActionFailedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn reason(mut self, value: impl Into<String>) -> Self {
        self.reason = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxActionFailedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](InboxActionFailedEncodedBuilder::tag)
    /// - [`reason`](InboxActionFailedEncodedBuilder::reason)
    pub fn build(self) -> Result<InboxActionFailedEncoded, BuildError> {
        Ok(InboxActionFailedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
