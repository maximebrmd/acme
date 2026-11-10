pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ReviewCommentResolved {
    #[serde(default)]
    pub at: String,
    pub by: Reviewer,
}

impl ReviewCommentResolved {
    pub fn builder() -> ReviewCommentResolvedBuilder {
        <ReviewCommentResolvedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReviewCommentResolvedBuilder {
    at: Option<String>,
    by: Option<Reviewer>,
}

impl ReviewCommentResolvedBuilder {
    pub fn at(mut self, value: impl Into<String>) -> Self {
        self.at = Some(value.into());
        self
    }

    pub fn by(mut self, value: Reviewer) -> Self {
        self.by = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ReviewCommentResolved`].
    /// This method will fail if any of the following fields are not set:
    /// - [`at`](ReviewCommentResolvedBuilder::at)
    /// - [`by`](ReviewCommentResolvedBuilder::by)
    pub fn build(self) -> Result<ReviewCommentResolved, BuildError> {
        Ok(ReviewCommentResolved {
            at: self.at.ok_or_else(|| BuildError::missing_field("at"))?,
            by: self.by.ok_or_else(|| BuildError::missing_field("by"))?,
        })
    }
}
