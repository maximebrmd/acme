pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ActivityPage {
    #[serde(default)]
    pub items: Vec<ActivityEvent>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl ActivityPage {
    pub fn builder() -> ActivityPageBuilder {
        <ActivityPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ActivityPageBuilder {
    items: Option<Vec<ActivityEvent>>,
    next_cursor: Option<String>,
}

impl ActivityPageBuilder {
    pub fn items(mut self, value: Vec<ActivityEvent>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ActivityPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](ActivityPageBuilder::items)
    pub fn build(self) -> Result<ActivityPage, BuildError> {
        Ok(ActivityPage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
