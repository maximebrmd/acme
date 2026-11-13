pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct FollowUpCapabilities {
    #[serde(rename = "commentTextLimits")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment_text_limits: Option<Vec<TextLimit>>,
    pub kind: FollowUpCapabilitiesKind,
    #[serde(rename = "maxCount")]
    #[serde(default)]
    pub max_count: i64,
}

impl FollowUpCapabilities {
    pub fn builder() -> FollowUpCapabilitiesBuilder {
        <FollowUpCapabilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FollowUpCapabilitiesBuilder {
    comment_text_limits: Option<Vec<TextLimit>>,
    kind: Option<FollowUpCapabilitiesKind>,
    max_count: Option<i64>,
}

impl FollowUpCapabilitiesBuilder {
    pub fn comment_text_limits(mut self, value: Vec<TextLimit>) -> Self {
        self.comment_text_limits = Some(value);
        self
    }

    pub fn kind(mut self, value: FollowUpCapabilitiesKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn max_count(mut self, value: i64) -> Self {
        self.max_count = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`FollowUpCapabilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`kind`](FollowUpCapabilitiesBuilder::kind)
    /// - [`max_count`](FollowUpCapabilitiesBuilder::max_count)
    pub fn build(self) -> Result<FollowUpCapabilities, BuildError> {
        Ok(FollowUpCapabilities {
            comment_text_limits: self.comment_text_limits,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
            max_count: self
                .max_count
                .ok_or_else(|| BuildError::missing_field("max_count"))?,
        })
    }
}
