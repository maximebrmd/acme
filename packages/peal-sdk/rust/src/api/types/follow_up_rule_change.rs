pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FollowUpRuleChange {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub likes: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paused: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repost: Option<bool>,
}

impl FollowUpRuleChange {
    pub fn builder() -> FollowUpRuleChangeBuilder {
        <FollowUpRuleChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FollowUpRuleChangeBuilder {
    comment: Option<String>,
    likes: Option<i64>,
    paused: Option<bool>,
    repost: Option<bool>,
}

impl FollowUpRuleChangeBuilder {
    pub fn comment(mut self, value: impl Into<String>) -> Self {
        self.comment = Some(value.into());
        self
    }

    pub fn likes(mut self, value: i64) -> Self {
        self.likes = Some(value);
        self
    }

    pub fn paused(mut self, value: bool) -> Self {
        self.paused = Some(value);
        self
    }

    pub fn repost(mut self, value: bool) -> Self {
        self.repost = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`FollowUpRuleChange`].
    pub fn build(self) -> Result<FollowUpRuleChange, BuildError> {
        Ok(FollowUpRuleChange {
            comment: self.comment,
            likes: self.likes,
            paused: self.paused,
            repost: self.repost,
        })
    }
}
