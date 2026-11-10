pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CommentSelection {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub located: Option<CommentSelectionLocated>,
    #[serde(default)]
    pub quote: String,
    #[serde(default)]
    pub start: i64,
}

impl CommentSelection {
    pub fn builder() -> CommentSelectionBuilder {
        <CommentSelectionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CommentSelectionBuilder {
    located: Option<CommentSelectionLocated>,
    quote: Option<String>,
    start: Option<i64>,
}

impl CommentSelectionBuilder {
    pub fn located(mut self, value: CommentSelectionLocated) -> Self {
        self.located = Some(value);
        self
    }

    pub fn quote(mut self, value: impl Into<String>) -> Self {
        self.quote = Some(value.into());
        self
    }

    pub fn start(mut self, value: i64) -> Self {
        self.start = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CommentSelection`].
    /// This method will fail if any of the following fields are not set:
    /// - [`quote`](CommentSelectionBuilder::quote)
    /// - [`start`](CommentSelectionBuilder::start)
    pub fn build(self) -> Result<CommentSelection, BuildError> {
        Ok(CommentSelection {
            located: self.located,
            quote: self
                .quote
                .ok_or_else(|| BuildError::missing_field("quote"))?,
            start: self
                .start
                .ok_or_else(|| BuildError::missing_field("start"))?,
        })
    }
}
