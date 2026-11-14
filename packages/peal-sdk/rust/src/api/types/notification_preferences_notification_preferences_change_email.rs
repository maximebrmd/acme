pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NotificationPreferencesChangeEmail {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub automations: Option<bool>,
    #[serde(rename = "channelReconnect")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_reconnect: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comments: Option<bool>,
    #[serde(rename = "feedStopped")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub feed_stopped: Option<bool>,
    #[serde(rename = "postFailed")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_failed: Option<bool>,
    #[serde(rename = "postPublished")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_published: Option<bool>,
    #[serde(rename = "postReview")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_review: Option<bool>,
    #[serde(rename = "postUnconfirmed")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_unconfirmed: Option<bool>,
    #[serde(rename = "recyclingEnded")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recycling_ended: Option<bool>,
    #[serde(rename = "webhookFailing")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub webhook_failing: Option<bool>,
    #[serde(rename = "weeklyDigest")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weekly_digest: Option<bool>,
}

impl NotificationPreferencesChangeEmail {
    pub fn builder() -> NotificationPreferencesChangeEmailBuilder {
        <NotificationPreferencesChangeEmailBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NotificationPreferencesChangeEmailBuilder {
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

impl NotificationPreferencesChangeEmailBuilder {
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

    /// Consumes the builder and constructs a [`NotificationPreferencesChangeEmail`].
    pub fn build(self) -> Result<NotificationPreferencesChangeEmail, BuildError> {
        Ok(NotificationPreferencesChangeEmail {
            automations: self.automations,
            channel_reconnect: self.channel_reconnect,
            comments: self.comments,
            feed_stopped: self.feed_stopped,
            post_failed: self.post_failed,
            post_published: self.post_published,
            post_review: self.post_review,
            post_unconfirmed: self.post_unconfirmed,
            recycling_ended: self.recycling_ended,
            webhook_failing: self.webhook_failing,
            weekly_digest: self.weekly_digest,
        })
    }
}
