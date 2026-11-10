pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ResolveReviewRequest {
    #[serde(default)]
    pub resolved: bool,
}

impl ResolveReviewRequest {
    pub fn builder() -> ResolveReviewRequestBuilder {
        <ResolveReviewRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ResolveReviewRequestBuilder {
    resolved: Option<bool>,
}

impl ResolveReviewRequestBuilder {
    pub fn resolved(mut self, value: bool) -> Self {
        self.resolved = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ResolveReviewRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`resolved`](ResolveReviewRequestBuilder::resolved)
    pub fn build(self) -> Result<ResolveReviewRequest, BuildError> {
        Ok(ResolveReviewRequest {
            resolved: self
                .resolved
                .ok_or_else(|| BuildError::missing_field("resolved"))?,
        })
    }
}
