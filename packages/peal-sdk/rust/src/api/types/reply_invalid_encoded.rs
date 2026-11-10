pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ReplyInvalidEncoded {
    #[serde(rename = "_tag")]
    pub tag: ReplyInvalidEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub length: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub maximum: Option<i64>,
    pub reason: ReplyInvalidEncodedReason,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
}

impl ReplyInvalidEncoded {
    pub fn builder() -> ReplyInvalidEncodedBuilder {
        <ReplyInvalidEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReplyInvalidEncodedBuilder {
    tag: Option<ReplyInvalidEncodedTag>,
    length: Option<i64>,
    maximum: Option<i64>,
    reason: Option<ReplyInvalidEncodedReason>,
    unit: Option<String>,
}

impl ReplyInvalidEncodedBuilder {
    pub fn tag(mut self, value: ReplyInvalidEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn length(mut self, value: i64) -> Self {
        self.length = Some(value);
        self
    }

    pub fn maximum(mut self, value: i64) -> Self {
        self.maximum = Some(value);
        self
    }

    pub fn reason(mut self, value: ReplyInvalidEncodedReason) -> Self {
        self.reason = Some(value);
        self
    }

    pub fn unit(mut self, value: impl Into<String>) -> Self {
        self.unit = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ReplyInvalidEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ReplyInvalidEncodedBuilder::tag)
    /// - [`reason`](ReplyInvalidEncodedBuilder::reason)
    pub fn build(self) -> Result<ReplyInvalidEncoded, BuildError> {
        Ok(ReplyInvalidEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            length: self.length,
            maximum: self.maximum,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
            unit: self.unit,
        })
    }
}
