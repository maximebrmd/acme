pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct CommentRuleMatch {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(rename = "commentId")]
    #[serde(default)]
    pub comment_id: String,
    #[serde(rename = "lookedAt")]
    #[serde(default)]
    pub looked_at: String,
    pub outcome: CommentRuleOutcome,
    #[serde(rename = "replyId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reply_id: Option<String>,
}

impl CommentRuleMatch {
    pub fn builder() -> CommentRuleMatchBuilder {
        <CommentRuleMatchBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CommentRuleMatchBuilder {
    code: Option<String>,
    comment_id: Option<String>,
    looked_at: Option<String>,
    outcome: Option<CommentRuleOutcome>,
    reply_id: Option<String>,
}

impl CommentRuleMatchBuilder {
    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn comment_id(mut self, value: impl Into<String>) -> Self {
        self.comment_id = Some(value.into());
        self
    }

    pub fn looked_at(mut self, value: impl Into<String>) -> Self {
        self.looked_at = Some(value.into());
        self
    }

    pub fn outcome(mut self, value: CommentRuleOutcome) -> Self {
        self.outcome = Some(value);
        self
    }

    pub fn reply_id(mut self, value: impl Into<String>) -> Self {
        self.reply_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CommentRuleMatch`].
    /// This method will fail if any of the following fields are not set:
    /// - [`comment_id`](CommentRuleMatchBuilder::comment_id)
    /// - [`looked_at`](CommentRuleMatchBuilder::looked_at)
    /// - [`outcome`](CommentRuleMatchBuilder::outcome)
    pub fn build(self) -> Result<CommentRuleMatch, BuildError> {
        Ok(CommentRuleMatch {
            code: self.code,
            comment_id: self
                .comment_id
                .ok_or_else(|| BuildError::missing_field("comment_id"))?,
            looked_at: self
                .looked_at
                .ok_or_else(|| BuildError::missing_field("looked_at"))?,
            outcome: self
                .outcome
                .ok_or_else(|| BuildError::missing_field("outcome"))?,
            reply_id: self.reply_id,
        })
    }
}
