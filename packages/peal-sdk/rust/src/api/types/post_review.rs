pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PostReview {
    #[serde(default)]
    pub approvals: Vec<ApprovalRequest>,
    #[serde(default)]
    pub channels: Vec<ReviewedChannel>,
    #[serde(default)]
    pub comments: Vec<ReviewComment>,
    #[serde(default)]
    pub media: Vec<ReviewedMedia>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub poll: Option<Poll>,
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
    channels: Option<Vec<ReviewedChannel>>,
    comments: Option<Vec<ReviewComment>>,
    media: Option<Vec<ReviewedMedia>>,
    poll: Option<Poll>,
}

impl PostReviewBuilder {
    pub fn approvals(mut self, value: Vec<ApprovalRequest>) -> Self {
        self.approvals = Some(value);
        self
    }

    pub fn channels(mut self, value: Vec<ReviewedChannel>) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn comments(mut self, value: Vec<ReviewComment>) -> Self {
        self.comments = Some(value);
        self
    }

    pub fn media(mut self, value: Vec<ReviewedMedia>) -> Self {
        self.media = Some(value);
        self
    }

    pub fn poll(mut self, value: Poll) -> Self {
        self.poll = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostReview`].
    /// This method will fail if any of the following fields are not set:
    /// - [`approvals`](PostReviewBuilder::approvals)
    /// - [`channels`](PostReviewBuilder::channels)
    /// - [`comments`](PostReviewBuilder::comments)
    /// - [`media`](PostReviewBuilder::media)
    pub fn build(self) -> Result<PostReview, BuildError> {
        Ok(PostReview {
            approvals: self
                .approvals
                .ok_or_else(|| BuildError::missing_field("approvals"))?,
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            comments: self
                .comments
                .ok_or_else(|| BuildError::missing_field("comments"))?,
            media: self
                .media
                .ok_or_else(|| BuildError::missing_field("media"))?,
            poll: self.poll,
        })
    }
}
