pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PostTarget {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dropped: Option<bool>,
    #[serde(rename = "editedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edited_at: Option<String>,
    #[serde(rename = "failureReason")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_reason: Option<FailureReason>,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "keptPrivate")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kept_private: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<TargetOptions>,
    #[serde(default)]
    pub parts: TargetParts,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permalink: Option<String>,
    #[serde(rename = "publishedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_at: Option<String>,
    #[serde(rename = "removedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub removed_at: Option<String>,
    #[serde(rename = "partsLeftOut")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parts_left_out: Option<bool>,
    #[serde(default)]
    pub round: i64,
    pub status: PostTargetStatus,
    #[serde(rename = "thumbnailNotSet")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_not_set: Option<bool>,
    #[serde(rename = "unconfirmedReason")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unconfirmed_reason: Option<UnconfirmedReason>,
}

impl PostTarget {
    pub fn builder() -> PostTargetBuilder {
        <PostTargetBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostTargetBuilder {
    channel_id: Option<String>,
    dropped: Option<bool>,
    edited_at: Option<String>,
    failure_reason: Option<FailureReason>,
    id: Option<String>,
    kept_private: Option<bool>,
    options: Option<TargetOptions>,
    parts: Option<TargetParts>,
    permalink: Option<String>,
    published_at: Option<String>,
    removed_at: Option<String>,
    parts_left_out: Option<bool>,
    round: Option<i64>,
    status: Option<PostTargetStatus>,
    thumbnail_not_set: Option<bool>,
    unconfirmed_reason: Option<UnconfirmedReason>,
}

impl PostTargetBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn dropped(mut self, value: bool) -> Self {
        self.dropped = Some(value);
        self
    }

    pub fn edited_at(mut self, value: impl Into<String>) -> Self {
        self.edited_at = Some(value.into());
        self
    }

    pub fn failure_reason(mut self, value: FailureReason) -> Self {
        self.failure_reason = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn kept_private(mut self, value: bool) -> Self {
        self.kept_private = Some(value);
        self
    }

    pub fn options(mut self, value: TargetOptions) -> Self {
        self.options = Some(value);
        self
    }

    pub fn parts(mut self, value: TargetParts) -> Self {
        self.parts = Some(value);
        self
    }

    pub fn permalink(mut self, value: impl Into<String>) -> Self {
        self.permalink = Some(value.into());
        self
    }

    pub fn published_at(mut self, value: impl Into<String>) -> Self {
        self.published_at = Some(value.into());
        self
    }

    pub fn removed_at(mut self, value: impl Into<String>) -> Self {
        self.removed_at = Some(value.into());
        self
    }

    pub fn parts_left_out(mut self, value: bool) -> Self {
        self.parts_left_out = Some(value);
        self
    }

    pub fn round(mut self, value: i64) -> Self {
        self.round = Some(value);
        self
    }

    pub fn status(mut self, value: PostTargetStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn thumbnail_not_set(mut self, value: bool) -> Self {
        self.thumbnail_not_set = Some(value);
        self
    }

    pub fn unconfirmed_reason(mut self, value: UnconfirmedReason) -> Self {
        self.unconfirmed_reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostTarget`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](PostTargetBuilder::channel_id)
    /// - [`id`](PostTargetBuilder::id)
    /// - [`parts`](PostTargetBuilder::parts)
    /// - [`round`](PostTargetBuilder::round)
    /// - [`status`](PostTargetBuilder::status)
    pub fn build(self) -> Result<PostTarget, BuildError> {
        Ok(PostTarget {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            dropped: self.dropped,
            edited_at: self.edited_at,
            failure_reason: self.failure_reason,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            kept_private: self.kept_private,
            options: self.options,
            parts: self
                .parts
                .ok_or_else(|| BuildError::missing_field("parts"))?,
            permalink: self.permalink,
            published_at: self.published_at,
            removed_at: self.removed_at,
            parts_left_out: self.parts_left_out,
            round: self
                .round
                .ok_or_else(|| BuildError::missing_field("round"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            thumbnail_not_set: self.thumbnail_not_set,
            unconfirmed_reason: self.unconfirmed_reason,
        })
    }
}
