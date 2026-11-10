pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostReview {
    #[serde(default)]
    pub approvals: Vec<ApprovalRequest>,
    #[serde(default)]
    pub comments: Vec<ReviewComment>,
}

impl PostReview {
    pub fn builder() -> PostReviewBuilder {
        <PostReviewBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostReviewBuilder {
    approvals: Option<Vec<ApprovalRequest>>,
    comments: Option<Vec<ReviewComment>>,
}

impl PostReviewBuilder {
    pub fn approvals(mut self, value: Vec<ApprovalRequest>) -> Self {
        self.approvals = Some(value);
        self
    }

    pub fn comments(mut self, value: Vec<ReviewComment>) -> Self {
        self.comments = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostReview`].
    /// This method will fail if any of the following fields are not set:
    /// - [`approvals`](PostReviewBuilder::approvals)
    /// - [`comments`](PostReviewBuilder::comments)
    pub fn build(self) -> Result<PostReview, BuildError> {
        Ok(PostReview {
            approvals: self
                .approvals
                .ok_or_else(|| BuildError::missing_field("approvals"))?,
            comments: self
                .comments
                .ok_or_else(|| BuildError::missing_field("comments"))?,
        })
    }
}
