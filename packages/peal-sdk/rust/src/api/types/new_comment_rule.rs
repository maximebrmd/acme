pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewCommentRule {
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
    #[serde(default)]
    pub reply: String,
}

impl NewCommentRule {
    pub fn builder() -> NewCommentRuleBuilder {
        <NewCommentRuleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewCommentRuleBuilder {
    channel_id: Option<String>,
    keywords: Option<Vec<String>>,
    post_id: Option<String>,
    reply: Option<String>,
}

impl NewCommentRuleBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn keywords(mut self, value: Vec<String>) -> Self {
        self.keywords = Some(value);
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn reply(mut self, value: impl Into<String>) -> Self {
        self.reply = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewCommentRule`].
    /// This method will fail if any of the following fields are not set:
    /// - [`keywords`](NewCommentRuleBuilder::keywords)
    /// - [`reply`](NewCommentRuleBuilder::reply)
    pub fn build(self) -> Result<NewCommentRule, BuildError> {
        Ok(NewCommentRule {
            channel_id: self.channel_id,
            keywords: self
                .keywords
                .ok_or_else(|| BuildError::missing_field("keywords"))?,
            post_id: self.post_id,
            reply: self
                .reply
                .ok_or_else(|| BuildError::missing_field("reply"))?,
        })
    }
}
