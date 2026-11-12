pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct FeedItem {
    #[serde(rename = "itemAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_at: Option<String>,
    pub outcome: FeedItemOutcome,
    #[serde(rename = "pictureSkipped")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub picture_skipped: Option<FeedPictureSkip>,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<FeedItemReason>,
    #[serde(rename = "seenAt")]
    #[serde(default)]
    pub seen_at: String,
}

impl FeedItem {
    pub fn builder() -> FeedItemBuilder {
        <FeedItemBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FeedItemBuilder {
    item_at: Option<String>,
    outcome: Option<FeedItemOutcome>,
    picture_skipped: Option<FeedPictureSkip>,
    post_id: Option<String>,
    reason: Option<FeedItemReason>,
    seen_at: Option<String>,
}

impl FeedItemBuilder {
    pub fn item_at(mut self, value: impl Into<String>) -> Self {
        self.item_at = Some(value.into());
        self
    }

    pub fn outcome(mut self, value: FeedItemOutcome) -> Self {
        self.outcome = Some(value);
        self
    }

    pub fn picture_skipped(mut self, value: FeedPictureSkip) -> Self {
        self.picture_skipped = Some(value);
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn reason(mut self, value: FeedItemReason) -> Self {
        self.reason = Some(value);
        self
    }

    pub fn seen_at(mut self, value: impl Into<String>) -> Self {
        self.seen_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`FeedItem`].
    /// This method will fail if any of the following fields are not set:
    /// - [`outcome`](FeedItemBuilder::outcome)
    /// - [`seen_at`](FeedItemBuilder::seen_at)
    pub fn build(self) -> Result<FeedItem, BuildError> {
        Ok(FeedItem {
            item_at: self.item_at,
            outcome: self
                .outcome
                .ok_or_else(|| BuildError::missing_field("outcome"))?,
            picture_skipped: self.picture_skipped,
            post_id: self.post_id,
            reason: self.reason,
            seen_at: self
                .seen_at
                .ok_or_else(|| BuildError::missing_field("seen_at"))?,
        })
    }
}
