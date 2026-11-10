pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxActionFailedEncoded {
    #[serde(rename = "_tag")]
    pub tag: InboxActionFailedEncodedTag,
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

impl InboxActionFailedEncoded {
    pub fn builder() -> InboxActionFailedEncodedBuilder {
        <InboxActionFailedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxActionFailedEncodedBuilder {
    tag: Option<InboxActionFailedEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    reason: Option<String>,
}

impl InboxActionFailedEncodedBuilder {
    pub fn tag(mut self, value: InboxActionFailedEncodedTag) -> Self {
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

    /// Consumes the builder and constructs a [`InboxActionFailedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](InboxActionFailedEncodedBuilder::tag)
    /// - [`reason`](InboxActionFailedEncodedBuilder::reason)
    pub fn build(self) -> Result<InboxActionFailedEncoded, BuildError> {
        Ok(InboxActionFailedEncoded {
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
