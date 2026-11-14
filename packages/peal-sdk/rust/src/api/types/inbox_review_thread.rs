pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InboxReviewThread {
    #[serde(rename = "averageRating")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub average_rating: Option<InboxReviewThreadAverageRating>,
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(default)]
    pub id: String,
    pub kind: InboxReviewThreadKind,
    #[serde(rename = "lastCollectedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_collected_at: Option<String>,
    #[serde(rename = "lastReviewAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_review_at: Option<String>,
    #[serde(default)]
    pub reviews: i64,
    #[serde(rename = "totalReviewCount")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_review_count: Option<i64>,
    #[serde(default)]
    pub unanswered: i64,
}

impl InboxReviewThread {
    pub fn builder() -> InboxReviewThreadBuilder {
        <InboxReviewThreadBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxReviewThreadBuilder {
    average_rating: Option<InboxReviewThreadAverageRating>,
    channel_id: Option<String>,
    id: Option<String>,
    kind: Option<InboxReviewThreadKind>,
    last_collected_at: Option<String>,
    last_review_at: Option<String>,
    reviews: Option<i64>,
    total_review_count: Option<i64>,
    unanswered: Option<i64>,
}

impl InboxReviewThreadBuilder {
    pub fn average_rating(mut self, value: InboxReviewThreadAverageRating) -> Self {
        self.average_rating = Some(value);
        self
    }

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn kind(mut self, value: InboxReviewThreadKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn last_collected_at(mut self, value: impl Into<String>) -> Self {
        self.last_collected_at = Some(value.into());
        self
    }

    pub fn last_review_at(mut self, value: impl Into<String>) -> Self {
        self.last_review_at = Some(value.into());
        self
    }

    pub fn reviews(mut self, value: i64) -> Self {
        self.reviews = Some(value);
        self
    }

    pub fn total_review_count(mut self, value: i64) -> Self {
        self.total_review_count = Some(value);
        self
    }

    pub fn unanswered(mut self, value: i64) -> Self {
        self.unanswered = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxReviewThread`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](InboxReviewThreadBuilder::channel_id)
    /// - [`id`](InboxReviewThreadBuilder::id)
    /// - [`kind`](InboxReviewThreadBuilder::kind)
    /// - [`reviews`](InboxReviewThreadBuilder::reviews)
    /// - [`unanswered`](InboxReviewThreadBuilder::unanswered)
    pub fn build(self) -> Result<InboxReviewThread, BuildError> {
        Ok(InboxReviewThread {
            average_rating: self.average_rating,
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
            last_collected_at: self.last_collected_at,
            last_review_at: self.last_review_at,
            reviews: self
                .reviews
                .ok_or_else(|| BuildError::missing_field("reviews"))?,
            total_review_count: self.total_review_count,
            unanswered: self
                .unanswered
                .ok_or_else(|| BuildError::missing_field("unanswered"))?,
        })
    }
}
