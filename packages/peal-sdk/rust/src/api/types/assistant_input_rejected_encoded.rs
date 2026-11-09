pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AssistantInputRejectedEncoded {
    #[serde(rename = "_tag")]
    pub tag: AssistantInputRejectedEncodedTag,
    #[serde(rename = "maxLength")]
    #[serde(default)]
    pub max_length: i64,
    pub reason: AssistantInputRejectedEncodedReason,
}

impl AssistantInputRejectedEncoded {
    pub fn builder() -> AssistantInputRejectedEncodedBuilder {
        <AssistantInputRejectedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AssistantInputRejectedEncodedBuilder {
    tag: Option<AssistantInputRejectedEncodedTag>,
    max_length: Option<i64>,
    reason: Option<AssistantInputRejectedEncodedReason>,
}

impl AssistantInputRejectedEncodedBuilder {
    pub fn tag(mut self, value: AssistantInputRejectedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn max_length(mut self, value: i64) -> Self {
        self.max_length = Some(value);
        self
    }

    pub fn reason(mut self, value: AssistantInputRejectedEncodedReason) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AssistantInputRejectedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](AssistantInputRejectedEncodedBuilder::tag)
    /// - [`max_length`](AssistantInputRejectedEncodedBuilder::max_length)
    /// - [`reason`](AssistantInputRejectedEncodedBuilder::reason)
    pub fn build(self) -> Result<AssistantInputRejectedEncoded, BuildError> {
        Ok(AssistantInputRejectedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            max_length: self
                .max_length
                .ok_or_else(|| BuildError::missing_field("max_length"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
