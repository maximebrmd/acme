pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InboxReviewThreadDetail {
    pub abilities: InboxReviewAbilities,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
    #[serde(default)]
    pub replies: Vec<InboxReviewReply>,
    #[serde(default)]
    pub reviews: Vec<InboxReview>,
    pub thread: InboxReviewThread,
}

impl InboxReviewThreadDetail {
    pub fn builder() -> InboxReviewThreadDetailBuilder {
        <InboxReviewThreadDetailBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxReviewThreadDetailBuilder {
    abilities: Option<InboxReviewAbilities>,
    platform: Option<Platform>,
    replies: Option<Vec<InboxReviewReply>>,
    reviews: Option<Vec<InboxReview>>,
    thread: Option<InboxReviewThread>,
}

impl InboxReviewThreadDetailBuilder {
    pub fn abilities(mut self, value: InboxReviewAbilities) -> Self {
        self.abilities = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn replies(mut self, value: Vec<InboxReviewReply>) -> Self {
        self.replies = Some(value);
        self
    }

    pub fn reviews(mut self, value: Vec<InboxReview>) -> Self {
        self.reviews = Some(value);
        self
    }

    pub fn thread(mut self, value: InboxReviewThread) -> Self {
        self.thread = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxReviewThreadDetail`].
    /// This method will fail if any of the following fields are not set:
    /// - [`abilities`](InboxReviewThreadDetailBuilder::abilities)
    /// - [`replies`](InboxReviewThreadDetailBuilder::replies)
    /// - [`reviews`](InboxReviewThreadDetailBuilder::reviews)
    /// - [`thread`](InboxReviewThreadDetailBuilder::thread)
    pub fn build(self) -> Result<InboxReviewThreadDetail, BuildError> {
        Ok(InboxReviewThreadDetail {
            abilities: self
                .abilities
                .ok_or_else(|| BuildError::missing_field("abilities"))?,
            platform: self.platform,
            replies: self
                .replies
                .ok_or_else(|| BuildError::missing_field("replies"))?,
            reviews: self
                .reviews
                .ok_or_else(|| BuildError::missing_field("reviews"))?,
            thread: self
                .thread
                .ok_or_else(|| BuildError::missing_field("thread"))?,
        })
    }
}
