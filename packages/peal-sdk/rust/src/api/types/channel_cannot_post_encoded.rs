pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ChannelCannotPostEncoded {
    #[serde(rename = "_tag")]
    pub tag: ChannelCannotPostEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub reason: ChannelCannotPostEncodedReason,
}

impl ChannelCannotPostEncoded {
    pub fn builder() -> ChannelCannotPostEncodedBuilder {
        <ChannelCannotPostEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelCannotPostEncodedBuilder {
    tag: Option<ChannelCannotPostEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    reason: Option<ChannelCannotPostEncodedReason>,
}

impl ChannelCannotPostEncodedBuilder {
    pub fn tag(mut self, value: ChannelCannotPostEncodedTag) -> Self {
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

    pub fn reason(mut self, value: ChannelCannotPostEncodedReason) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelCannotPostEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ChannelCannotPostEncodedBuilder::tag)
    /// - [`reason`](ChannelCannotPostEncodedBuilder::reason)
    pub fn build(self) -> Result<ChannelCannotPostEncoded, BuildError> {
        Ok(ChannelCannotPostEncoded {
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
