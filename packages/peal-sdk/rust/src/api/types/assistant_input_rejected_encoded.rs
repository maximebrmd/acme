pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AssistantInputRejectedEncoded {
    #[serde(rename = "_tag")]
    pub tag: AssistantInputRejectedEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
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
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    max_length: Option<i64>,
    reason: Option<AssistantInputRejectedEncodedReason>,
}

impl AssistantInputRejectedEncodedBuilder {
    pub fn tag(mut self, value: AssistantInputRejectedEncodedTag) -> Self {
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
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            max_length: self
                .max_length
                .ok_or_else(|| BuildError::missing_field("max_length"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
