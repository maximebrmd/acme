pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CommentRulePage {
    #[serde(default)]
    pub items: Vec<CommentRule>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl CommentRulePage {
    pub fn builder() -> CommentRulePageBuilder {
        <CommentRulePageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CommentRulePageBuilder {
    items: Option<Vec<CommentRule>>,
    next_cursor: Option<String>,
}

impl CommentRulePageBuilder {
    pub fn items(mut self, value: Vec<CommentRule>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CommentRulePage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](CommentRulePageBuilder::items)
    pub fn build(self) -> Result<CommentRulePage, BuildError> {
        Ok(CommentRulePage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
