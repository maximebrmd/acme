pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct NoticePage {
    #[serde(default)]
    pub items: Vec<Notice>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl NoticePage {
    pub fn builder() -> NoticePageBuilder {
        <NoticePageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NoticePageBuilder {
    items: Option<Vec<Notice>>,
    next_cursor: Option<String>,
}

impl NoticePageBuilder {
    pub fn items(mut self, value: Vec<Notice>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NoticePage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](NoticePageBuilder::items)
    pub fn build(self) -> Result<NoticePage, BuildError> {
        Ok(NoticePage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
