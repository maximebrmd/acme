pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct FollowUpNotPossibleEncoded {
    #[serde(rename = "_tag")]
    pub tag: FollowUpNotPossibleEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub channels: Vec<ChannelFollowUps>,
    pub reason: FollowUpRefusal,
}

impl FollowUpNotPossibleEncoded {
    pub fn builder() -> FollowUpNotPossibleEncodedBuilder {
        <FollowUpNotPossibleEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FollowUpNotPossibleEncodedBuilder {
    tag: Option<FollowUpNotPossibleEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    channels: Option<Vec<ChannelFollowUps>>,
    reason: Option<FollowUpRefusal>,
}

impl FollowUpNotPossibleEncodedBuilder {
    pub fn tag(mut self, value: FollowUpNotPossibleEncodedTag) -> Self {
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

    pub fn channels(mut self, value: Vec<ChannelFollowUps>) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn reason(mut self, value: FollowUpRefusal) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`FollowUpNotPossibleEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](FollowUpNotPossibleEncodedBuilder::tag)
    /// - [`channels`](FollowUpNotPossibleEncodedBuilder::channels)
    /// - [`reason`](FollowUpNotPossibleEncodedBuilder::reason)
    pub fn build(self) -> Result<FollowUpNotPossibleEncoded, BuildError> {
        Ok(FollowUpNotPossibleEncoded {
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
