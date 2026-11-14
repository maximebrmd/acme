pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FollowUpRulePage {
    #[serde(default)]
    pub items: Vec<FollowUpRule>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl FollowUpRulePage {
    pub fn builder() -> FollowUpRulePageBuilder {
        <FollowUpRulePageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FollowUpRulePageBuilder {
    items: Option<Vec<FollowUpRule>>,
    next_cursor: Option<String>,
}

impl FollowUpRulePageBuilder {
    pub fn items(mut self, value: Vec<FollowUpRule>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`FollowUpRulePage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](FollowUpRulePageBuilder::items)
    pub fn build(self) -> Result<FollowUpRulePage, BuildError> {
        Ok(FollowUpRulePage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
