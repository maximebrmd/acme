pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RecyclingRulePage {
    #[serde(default)]
    pub items: Vec<RecyclingRule>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl RecyclingRulePage {
    pub fn builder() -> RecyclingRulePageBuilder {
        <RecyclingRulePageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingRulePageBuilder {
    items: Option<Vec<RecyclingRule>>,
    next_cursor: Option<String>,
}

impl RecyclingRulePageBuilder {
    pub fn items(mut self, value: Vec<RecyclingRule>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`RecyclingRulePage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](RecyclingRulePageBuilder::items)
    pub fn build(self) -> Result<RecyclingRulePage, BuildError> {
        Ok(RecyclingRulePage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
