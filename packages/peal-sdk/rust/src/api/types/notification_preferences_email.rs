pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NotificationPreferencesEmail {
    #[serde(default)]
    pub automations: bool,
    #[serde(rename = "channelReconnect")]
    #[serde(default)]
    pub channel_reconnect: bool,
    #[serde(default)]
    pub comments: bool,
    #[serde(rename = "feedStopped")]
    #[serde(default)]
    pub feed_stopped: bool,
    #[serde(rename = "postFailed")]
    #[serde(default)]
    pub post_failed: bool,
    #[serde(rename = "postPublished")]
    #[serde(default)]
    pub post_published: bool,
    #[serde(rename = "postReview")]
    #[serde(default)]
    pub post_review: bool,
    #[serde(rename = "postUnconfirmed")]
    #[serde(default)]
    pub post_unconfirmed: bool,
    #[serde(rename = "recyclingEnded")]
    #[serde(default)]
    pub recycling_ended: bool,
    #[serde(rename = "webhookFailing")]
    #[serde(default)]
    pub webhook_failing: bool,
    #[serde(rename = "weeklyDigest")]
    #[serde(default)]
    pub weekly_digest: bool,
}

impl NotificationPreferencesEmail {
    pub fn builder() -> NotificationPreferencesEmailBuilder {
        <NotificationPreferencesEmailBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NotificationPreferencesEmailBuilder {
    automations: Option<bool>,
    channel_reconnect: Option<bool>,
    comments: Option<bool>,
    feed_stopped: Option<bool>,
    post_failed: Option<bool>,
    post_published: Option<bool>,
    post_review: Option<bool>,
    post_unconfirmed: Option<bool>,
    recycling_ended: Option<bool>,
    webhook_failing: Option<bool>,
    weekly_digest: Option<bool>,
}

impl NotificationPreferencesEmailBuilder {
    pub fn automations(mut self, value: bool) -> Self {
        self.automations = Some(value);
        self
    }

    pub fn channel_reconnect(mut self, value: bool) -> Self {
        self.channel_reconnect = Some(value);
        self
    }

    pub fn comments(mut self, value: bool) -> Self {
        self.comments = Some(value);
        self
    }

    pub fn feed_stopped(mut self, value: bool) -> Self {
        self.feed_stopped = Some(value);
        self
    }

    pub fn post_failed(mut self, value: bool) -> Self {
        self.post_failed = Some(value);
        self
    }

    pub fn post_published(mut self, value: bool) -> Self {
        self.post_published = Some(value);
        self
    }

    pub fn post_review(mut self, value: bool) -> Self {
        self.post_review = Some(value);
        self
    }

    pub fn post_unconfirmed(mut self, value: bool) -> Self {
        self.post_unconfirmed = Some(value);
        self
    }

    pub fn recycling_ended(mut self, value: bool) -> Self {
        self.recycling_ended = Some(value);
        self
    }

    pub fn webhook_failing(mut self, value: bool) -> Self {
        self.webhook_failing = Some(value);
        self
    }

    pub fn weekly_digest(mut self, value: bool) -> Self {
        self.weekly_digest = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NotificationPreferencesEmail`].
    /// This method will fail if any of the following fields are not set:
    /// - [`automations`](NotificationPreferencesEmailBuilder::automations)
    /// - [`channel_reconnect`](NotificationPreferencesEmailBuilder::channel_reconnect)
    /// - [`comments`](NotificationPreferencesEmailBuilder::comments)
    /// - [`feed_stopped`](NotificationPreferencesEmailBuilder::feed_stopped)
    /// - [`post_failed`](NotificationPreferencesEmailBuilder::post_failed)
    /// - [`post_published`](NotificationPreferencesEmailBuilder::post_published)
    /// - [`post_review`](NotificationPreferencesEmailBuilder::post_review)
    /// - [`post_unconfirmed`](NotificationPreferencesEmailBuilder::post_unconfirmed)
    /// - [`recycling_ended`](NotificationPreferencesEmailBuilder::recycling_ended)
    /// - [`webhook_failing`](NotificationPreferencesEmailBuilder::webhook_failing)
    /// - [`weekly_digest`](NotificationPreferencesEmailBuilder::weekly_digest)
    pub fn build(self) -> Result<NotificationPreferencesEmail, BuildError> {
        Ok(NotificationPreferencesEmail {
            automations: self
                .automations
                .ok_or_else(|| BuildError::missing_field("automations"))?,
            channel_reconnect: self
                .channel_reconnect
                .ok_or_else(|| BuildError::missing_field("channel_reconnect"))?,
            comments: self
                .comments
                .ok_or_else(|| BuildError::missing_field("comments"))?,
            feed_stopped: self
                .feed_stopped
                .ok_or_else(|| BuildError::missing_field("feed_stopped"))?,
            post_failed: self
                .post_failed
                .ok_or_else(|| BuildError::missing_field("post_failed"))?,
            post_published: self
                .post_published
                .ok_or_else(|| BuildError::missing_field("post_published"))?,
            post_review: self
                .post_review
                .ok_or_else(|| BuildError::missing_field("post_review"))?,
            post_unconfirmed: self
                .post_unconfirmed
                .ok_or_else(|| BuildError::missing_field("post_unconfirmed"))?,
            recycling_ended: self
                .recycling_ended
                .ok_or_else(|| BuildError::missing_field("recycling_ended"))?,
            webhook_failing: self
                .webhook_failing
                .ok_or_else(|| BuildError::missing_field("webhook_failing"))?,
            weekly_digest: self
                .weekly_digest
                .ok_or_else(|| BuildError::missing_field("weekly_digest"))?,
        })
    }
}
