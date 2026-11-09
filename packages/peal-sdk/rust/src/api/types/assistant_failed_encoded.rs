pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AssistantFailedEncoded {
    #[serde(rename = "_tag")]
    pub tag: AssistantFailedEncodedTag,
    pub reason: AssistantFailedEncodedReason,
}

impl AssistantFailedEncoded {
    pub fn builder() -> AssistantFailedEncodedBuilder {
        <AssistantFailedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AssistantFailedEncodedBuilder {
    tag: Option<AssistantFailedEncodedTag>,
    reason: Option<AssistantFailedEncodedReason>,
}

impl AssistantFailedEncodedBuilder {
    pub fn tag(mut self, value: AssistantFailedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn reason(mut self, value: AssistantFailedEncodedReason) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AssistantFailedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](AssistantFailedEncodedBuilder::tag)
    /// - [`reason`](AssistantFailedEncodedBuilder::reason)
    pub fn build(self) -> Result<AssistantFailedEncoded, BuildError> {
        Ok(AssistantFailedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
