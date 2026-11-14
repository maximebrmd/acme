pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewFollowUpRule {
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
    #[serde(default)]
    pub likes: i64,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repost: Option<bool>,
}

impl NewFollowUpRule {
    pub fn builder() -> NewFollowUpRuleBuilder {
        <NewFollowUpRuleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewFollowUpRuleBuilder {
    channel_id: Option<String>,
    comment: Option<String>,
    likes: Option<i64>,
    post_id: Option<String>,
    repost: Option<bool>,
}

impl NewFollowUpRuleBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn comment(mut self, value: impl Into<String>) -> Self {
        self.comment = Some(value.into());
        self
    }

    pub fn likes(mut self, value: i64) -> Self {
        self.likes = Some(value);
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn repost(mut self, value: bool) -> Self {
        self.repost = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewFollowUpRule`].
    /// This method will fail if any of the following fields are not set:
    /// - [`likes`](NewFollowUpRuleBuilder::likes)
    pub fn build(self) -> Result<NewFollowUpRule, BuildError> {
        Ok(NewFollowUpRule {
            channel_id: self.channel_id,
            comment: self.comment,
            likes: self
                .likes
                .ok_or_else(|| BuildError::missing_field("likes"))?,
            post_id: self.post_id,
            repost: self.repost,
        })
    }
}
