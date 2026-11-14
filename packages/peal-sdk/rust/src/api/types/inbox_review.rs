pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxReview {
    #[serde(default)]
    pub id: String,
    #[serde(rename = "markedAnswered")]
    #[serde(default)]
    pub marked_answered: bool,
    #[serde(default)]
    pub photos: i64,
    #[serde(default)]
    pub rating: i64,
    #[serde(rename = "receivedAt")]
    #[serde(default)]
    pub received_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reply: Option<InboxOwnerReply>,
    #[serde(rename = "reviewerName")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reviewer_name: Option<String>,
    pub state: InboxReviewState,
    #[serde(default)]
    pub text: String,
    #[serde(rename = "threadId")]
    #[serde(default)]
    pub thread_id: String,
    #[serde(rename = "updatedAt")]
    #[serde(default)]
    pub updated_at: String,
    #[serde(rename = "writtenAt")]
    #[serde(default)]
    pub written_at: String,
}

impl InboxReview {
    pub fn builder() -> InboxReviewBuilder {
        <InboxReviewBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxReviewBuilder {
    id: Option<String>,
    marked_answered: Option<bool>,
    photos: Option<i64>,
    rating: Option<i64>,
    received_at: Option<String>,
    reply: Option<InboxOwnerReply>,
    reviewer_name: Option<String>,
    state: Option<InboxReviewState>,
    text: Option<String>,
    thread_id: Option<String>,
    updated_at: Option<String>,
    written_at: Option<String>,
}

impl InboxReviewBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn marked_answered(mut self, value: bool) -> Self {
        self.marked_answered = Some(value);
        self
    }

    pub fn photos(mut self, value: i64) -> Self {
        self.photos = Some(value);
        self
    }

    pub fn rating(mut self, value: i64) -> Self {
        self.rating = Some(value);
        self
    }

    pub fn received_at(mut self, value: impl Into<String>) -> Self {
        self.received_at = Some(value.into());
        self
    }

    pub fn reply(mut self, value: InboxOwnerReply) -> Self {
        self.reply = Some(value);
        self
    }

    pub fn reviewer_name(mut self, value: impl Into<String>) -> Self {
        self.reviewer_name = Some(value.into());
        self
    }

    pub fn state(mut self, value: InboxReviewState) -> Self {
        self.state = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    pub fn thread_id(mut self, value: impl Into<String>) -> Self {
        self.thread_id = Some(value.into());
        self
    }

    pub fn updated_at(mut self, value: impl Into<String>) -> Self {
        self.updated_at = Some(value.into());
        self
    }

    pub fn written_at(mut self, value: impl Into<String>) -> Self {
        self.written_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InboxReview`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](InboxReviewBuilder::id)
    /// - [`marked_answered`](InboxReviewBuilder::marked_answered)
    /// - [`photos`](InboxReviewBuilder::photos)
    /// - [`rating`](InboxReviewBuilder::rating)
    /// - [`received_at`](InboxReviewBuilder::received_at)
    /// - [`state`](InboxReviewBuilder::state)
    /// - [`text`](InboxReviewBuilder::text)
    /// - [`thread_id`](InboxReviewBuilder::thread_id)
    /// - [`updated_at`](InboxReviewBuilder::updated_at)
    /// - [`written_at`](InboxReviewBuilder::written_at)
    pub fn build(self) -> Result<InboxReview, BuildError> {
        Ok(InboxReview {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            marked_answered: self
                .marked_answered
                .ok_or_else(|| BuildError::missing_field("marked_answered"))?,
            photos: self
                .photos
                .ok_or_else(|| BuildError::missing_field("photos"))?,
            rating: self
                .rating
                .ok_or_else(|| BuildError::missing_field("rating"))?,
            received_at: self
                .received_at
                .ok_or_else(|| BuildError::missing_field("received_at"))?,
            reply: self.reply,
            reviewer_name: self.reviewer_name,
            state: self
                .state
                .ok_or_else(|| BuildError::missing_field("state"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
            thread_id: self
                .thread_id
                .ok_or_else(|| BuildError::missing_field("thread_id"))?,
            updated_at: self
                .updated_at
                .ok_or_else(|| BuildError::missing_field("updated_at"))?,
            written_at: self
                .written_at
                .ok_or_else(|| BuildError::missing_field("written_at"))?,
        })
    }
}
