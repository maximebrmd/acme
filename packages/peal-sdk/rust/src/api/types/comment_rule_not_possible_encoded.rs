pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct CommentRuleNotPossibleEncoded {
    #[serde(rename = "_tag")]
    pub tag: CommentRuleNotPossibleEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub channels: Vec<ChannelCommentRule>,
    pub reason: CommentRuleRefusal,
}

impl CommentRuleNotPossibleEncoded {
    pub fn builder() -> CommentRuleNotPossibleEncodedBuilder {
        <CommentRuleNotPossibleEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CommentRuleNotPossibleEncodedBuilder {
    tag: Option<CommentRuleNotPossibleEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    channels: Option<Vec<ChannelCommentRule>>,
    reason: Option<CommentRuleRefusal>,
}

impl CommentRuleNotPossibleEncodedBuilder {
    pub fn tag(mut self, value: CommentRuleNotPossibleEncodedTag) -> Self {
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

    pub fn channels(mut self, value: Vec<ChannelCommentRule>) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn reason(mut self, value: CommentRuleRefusal) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CommentRuleNotPossibleEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](CommentRuleNotPossibleEncodedBuilder::tag)
    /// - [`channels`](CommentRuleNotPossibleEncodedBuilder::channels)
    /// - [`reason`](CommentRuleNotPossibleEncodedBuilder::reason)
    pub fn build(self) -> Result<CommentRuleNotPossibleEncoded, BuildError> {
        Ok(CommentRuleNotPossibleEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
