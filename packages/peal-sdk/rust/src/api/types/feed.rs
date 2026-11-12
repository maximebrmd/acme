pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct Feed {
    #[serde(rename = "attachPicture")]
    #[serde(default)]
    pub attach_picture: bool,
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
    #[serde(rename = "channelSetId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_set_id: Option<String>,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(rename = "failingSince")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failing_since: Option<String>,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "lastCheckedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_checked_at: Option<String>,
    #[serde(rename = "lastFailure")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_failure: Option<FeedFailure>,
    pub mode: FeedMode,
    #[serde(rename = "nextCheckAt")]
    #[serde(default)]
    pub next_check_at: String,
    #[serde(rename = "queueId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queue_id: Option<String>,
    #[serde(default)]
    pub since: String,
    #[serde(rename = "startedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_by: Option<String>,
    #[serde(rename = "startedVia")]
    pub started_via: PostOrigin,
    pub status: FeedStatus,
    #[serde(rename = "statusAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_at: Option<String>,
    #[serde(rename = "stopReason")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop_reason: Option<FeedStoppedReason>,
    #[serde(default)]
    pub template: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(rename = "updatedAt")]
    #[serde(default)]
    pub updated_at: String,
    #[serde(default)]
    pub url: String,
}

impl Feed {
    pub fn builder() -> FeedBuilder {
        <FeedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FeedBuilder {
    attach_picture: Option<bool>,
    channel_ids: Option<Vec<String>>,
    channel_set_id: Option<String>,
    created_at: Option<String>,
    failing_since: Option<String>,
    id: Option<String>,
    last_checked_at: Option<String>,
    last_failure: Option<FeedFailure>,
    mode: Option<FeedMode>,
    next_check_at: Option<String>,
    queue_id: Option<String>,
    since: Option<String>,
    started_by: Option<String>,
    started_via: Option<PostOrigin>,
    status: Option<FeedStatus>,
    status_at: Option<String>,
    stop_reason: Option<FeedStoppedReason>,
    template: Option<String>,
    title: Option<String>,
    updated_at: Option<String>,
    url: Option<String>,
}

impl FeedBuilder {
    pub fn attach_picture(mut self, value: bool) -> Self {
        self.attach_picture = Some(value);
        self
    }

    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    pub fn channel_set_id(mut self, value: impl Into<String>) -> Self {
        self.channel_set_id = Some(value.into());
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn failing_since(mut self, value: impl Into<String>) -> Self {
        self.failing_since = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn last_checked_at(mut self, value: impl Into<String>) -> Self {
        self.last_checked_at = Some(value.into());
        self
    }

    pub fn last_failure(mut self, value: FeedFailure) -> Self {
        self.last_failure = Some(value);
        self
    }

    pub fn mode(mut self, value: FeedMode) -> Self {
        self.mode = Some(value);
        self
    }

    pub fn next_check_at(mut self, value: impl Into<String>) -> Self {
        self.next_check_at = Some(value.into());
        self
    }

    pub fn queue_id(mut self, value: impl Into<String>) -> Self {
        self.queue_id = Some(value.into());
        self
    }

    pub fn since(mut self, value: impl Into<String>) -> Self {
        self.since = Some(value.into());
        self
    }

    pub fn started_by(mut self, value: impl Into<String>) -> Self {
        self.started_by = Some(value.into());
        self
    }

    pub fn started_via(mut self, value: PostOrigin) -> Self {
        self.started_via = Some(value);
        self
    }

    pub fn status(mut self, value: FeedStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn status_at(mut self, value: impl Into<String>) -> Self {
        self.status_at = Some(value.into());
        self
    }

    pub fn stop_reason(mut self, value: FeedStoppedReason) -> Self {
        self.stop_reason = Some(value);
        self
    }

    pub fn template(mut self, value: impl Into<String>) -> Self {
        self.template = Some(value.into());
        self
    }

    pub fn title(mut self, value: impl Into<String>) -> Self {
        self.title = Some(value.into());
        self
    }

    pub fn updated_at(mut self, value: impl Into<String>) -> Self {
        self.updated_at = Some(value.into());
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Feed`].
    /// This method will fail if any of the following fields are not set:
    /// - [`attach_picture`](FeedBuilder::attach_picture)
    /// - [`channel_ids`](FeedBuilder::channel_ids)
    /// - [`created_at`](FeedBuilder::created_at)
    /// - [`id`](FeedBuilder::id)
    /// - [`mode`](FeedBuilder::mode)
    /// - [`next_check_at`](FeedBuilder::next_check_at)
    /// - [`since`](FeedBuilder::since)
    /// - [`started_via`](FeedBuilder::started_via)
    /// - [`status`](FeedBuilder::status)
    /// - [`template`](FeedBuilder::template)
    /// - [`updated_at`](FeedBuilder::updated_at)
    /// - [`url`](FeedBuilder::url)
    pub fn build(self) -> Result<Feed, BuildError> {
        Ok(Feed {
            attach_picture: self
                .attach_picture
                .ok_or_else(|| BuildError::missing_field("attach_picture"))?,
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
            channel_set_id: self.channel_set_id,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            failing_since: self.failing_since,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            last_checked_at: self.last_checked_at,
            last_failure: self.last_failure,
            mode: self.mode.ok_or_else(|| BuildError::missing_field("mode"))?,
            next_check_at: self
                .next_check_at
                .ok_or_else(|| BuildError::missing_field("next_check_at"))?,
            queue_id: self.queue_id,
            since: self
                .since
                .ok_or_else(|| BuildError::missing_field("since"))?,
            started_by: self.started_by,
            started_via: self
                .started_via
                .ok_or_else(|| BuildError::missing_field("started_via"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            status_at: self.status_at,
            stop_reason: self.stop_reason,
            template: self
                .template
                .ok_or_else(|| BuildError::missing_field("template"))?,
            title: self.title,
            updated_at: self
                .updated_at
                .ok_or_else(|| BuildError::missing_field("updated_at"))?,
            url: self.url.ok_or_else(|| BuildError::missing_field("url"))?,
        })
    }
}
