pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct RecyclingRuleEndedEncoded {
    #[serde(rename = "_tag")]
    pub tag: RecyclingRuleEndedEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub reason: String,
}

impl RecyclingRuleEndedEncoded {
    pub fn builder() -> RecyclingRuleEndedEncodedBuilder {
        <RecyclingRuleEndedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingRuleEndedEncodedBuilder {
    tag: Option<RecyclingRuleEndedEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    reason: Option<String>,
}

impl RecyclingRuleEndedEncodedBuilder {
    pub fn tag(mut self, value: RecyclingRuleEndedEncodedTag) -> Self {
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

    pub fn reason(mut self, value: impl Into<String>) -> Self {
        self.reason = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`RecyclingRuleEndedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](RecyclingRuleEndedEncodedBuilder::tag)
    /// - [`reason`](RecyclingRuleEndedEncodedBuilder::reason)
    pub fn build(self) -> Result<RecyclingRuleEndedEncoded, BuildError> {
        Ok(RecyclingRuleEndedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
