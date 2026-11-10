pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NotificationPreferencesEmail {
    #[serde(rename = "channelReconnect")]
    #[serde(default)]
    pub channel_reconnect: bool,
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
}

impl NotificationPreferencesEmail {
    pub fn builder() -> NotificationPreferencesEmailBuilder {
        <NotificationPreferencesEmailBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NotificationPreferencesEmailBuilder {
    channel_reconnect: Option<bool>,
    post_failed: Option<bool>,
    post_published: Option<bool>,
    post_review: Option<bool>,
    post_unconfirmed: Option<bool>,
}

impl NotificationPreferencesEmailBuilder {
    pub fn channel_reconnect(mut self, value: bool) -> Self {
        self.channel_reconnect = Some(value);
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

    /// Consumes the builder and constructs a [`NotificationPreferencesEmail`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_reconnect`](NotificationPreferencesEmailBuilder::channel_reconnect)
    /// - [`post_failed`](NotificationPreferencesEmailBuilder::post_failed)
    /// - [`post_published`](NotificationPreferencesEmailBuilder::post_published)
    /// - [`post_review`](NotificationPreferencesEmailBuilder::post_review)
    /// - [`post_unconfirmed`](NotificationPreferencesEmailBuilder::post_unconfirmed)
    pub fn build(self) -> Result<NotificationPreferencesEmail, BuildError> {
        Ok(NotificationPreferencesEmail {
            channel_reconnect: self
                .channel_reconnect
                .ok_or_else(|| BuildError::missing_field("channel_reconnect"))?,
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
        })
    }
}
