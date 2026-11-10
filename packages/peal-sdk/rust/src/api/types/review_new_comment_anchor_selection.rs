pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewCommentAnchorSelection {
    #[serde(default)]
    pub quote: String,
    #[serde(default)]
    pub start: i64,
}

impl NewCommentAnchorSelection {
    pub fn builder() -> NewCommentAnchorSelectionBuilder {
        <NewCommentAnchorSelectionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewCommentAnchorSelectionBuilder {
    quote: Option<String>,
    start: Option<i64>,
}

impl NewCommentAnchorSelectionBuilder {
    pub fn quote(mut self, value: impl Into<String>) -> Self {
        self.quote = Some(value.into());
        self
    }

    pub fn start(mut self, value: i64) -> Self {
        self.start = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewCommentAnchorSelection`].
    /// This method will fail if any of the following fields are not set:
    /// - [`quote`](NewCommentAnchorSelectionBuilder::quote)
    /// - [`start`](NewCommentAnchorSelectionBuilder::start)
    pub fn build(self) -> Result<NewCommentAnchorSelection, BuildError> {
        Ok(NewCommentAnchorSelection {
            quote: self
                .quote
                .ok_or_else(|| BuildError::missing_field("quote"))?,
            start: self
                .start
                .ok_or_else(|| BuildError::missing_field("start"))?,
        })
    }
}
