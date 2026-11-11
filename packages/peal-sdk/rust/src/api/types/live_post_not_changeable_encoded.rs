pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct LivePostNotChangeableEncoded {
    #[serde(rename = "_tag")]
    pub tag: LivePostNotChangeableEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub reason: LivePostRefusal,
}

impl LivePostNotChangeableEncoded {
    pub fn builder() -> LivePostNotChangeableEncodedBuilder {
        <LivePostNotChangeableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LivePostNotChangeableEncodedBuilder {
    tag: Option<LivePostNotChangeableEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    reason: Option<LivePostRefusal>,
}

impl LivePostNotChangeableEncodedBuilder {
    pub fn tag(mut self, value: LivePostNotChangeableEncodedTag) -> Self {
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

    pub fn reason(mut self, value: LivePostRefusal) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`LivePostNotChangeableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](LivePostNotChangeableEncodedBuilder::tag)
    /// - [`reason`](LivePostNotChangeableEncodedBuilder::reason)
    pub fn build(self) -> Result<LivePostNotChangeableEncoded, BuildError> {
        Ok(LivePostNotChangeableEncoded {
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
