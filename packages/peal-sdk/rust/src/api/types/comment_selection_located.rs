pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CommentSelectionLocated {
    #[serde(default)]
    pub end: i64,
    #[serde(default)]
    pub start: i64,
}

impl CommentSelectionLocated {
    pub fn builder() -> CommentSelectionLocatedBuilder {
        <CommentSelectionLocatedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CommentSelectionLocatedBuilder {
    end: Option<i64>,
    start: Option<i64>,
}

impl CommentSelectionLocatedBuilder {
    pub fn end(mut self, value: i64) -> Self {
        self.end = Some(value);
        self
    }

    pub fn start(mut self, value: i64) -> Self {
        self.start = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CommentSelectionLocated`].
    /// This method will fail if any of the following fields are not set:
    /// - [`end`](CommentSelectionLocatedBuilder::end)
    /// - [`start`](CommentSelectionLocatedBuilder::start)
    pub fn build(self) -> Result<CommentSelectionLocated, BuildError> {
        Ok(CommentSelectionLocated {
            end: self.end.ok_or_else(|| BuildError::missing_field("end"))?,
            start: self
                .start
                .ok_or_else(|| BuildError::missing_field("start"))?,
        })
    }
}
