pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum NoticeEvent {
    #[non_exhaustive]
    PostPublished {
        #[serde(skip_serializing_if = "Option::is_none")]
        channel: Option<NoticeChannel>,
        #[serde(skip_serializing_if = "Option::is_none")]
        permalink: Option<String>,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
    },

    #[non_exhaustive]
    PostFailed {
        #[serde(skip_serializing_if = "Option::is_none")]
        channel: Option<NoticeChannel>,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
        reason: FailureReason,
    },

    #[non_exhaustive]
    PostUnconfirmed {
        #[serde(skip_serializing_if = "Option::is_none")]
        channel: Option<NoticeChannel>,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
    },

    #[non_exhaustive]
    ChannelReconnectRequired { channel: NoticeChannel },

    #[non_exhaustive]
    ChannelReconnectSoon {
        channel: NoticeChannel,
        #[serde(rename = "expiresAt")]
        #[serde(default)]
        expires_at: String,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl NoticeEvent {
    pub fn post_published(post_id: String) -> Self {
        Self::PostPublished {
            channel: None,
            permalink: None,
            post_id,
        }
    }

    pub fn post_failed(post_id: String, reason: FailureReason) -> Self {
        Self::PostFailed {
            channel: None,
            post_id,
            reason,
        }
    }

    pub fn post_unconfirmed(post_id: String) -> Self {
        Self::PostUnconfirmed {
            channel: None,
            post_id,
        }
    }

    pub fn channel_reconnect_required(channel: NoticeChannel) -> Self {
        Self::ChannelReconnectRequired { channel }
    }

    pub fn channel_reconnect_soon(channel: NoticeChannel, expires_at: String) -> Self {
        Self::ChannelReconnectSoon {
            channel,
            expires_at,
        }
    }

    pub fn post_published_with_channel(
        channel: NoticeChannel,
        permalink: Option<String>,
        post_id: String,
    ) -> Self {
        Self::PostPublished {
            channel: Some(channel),
            permalink,
            post_id,
        }
    }

    pub fn post_published_with_permalink(
        channel: Option<NoticeChannel>,
        permalink: String,
        post_id: String,
    ) -> Self {
        Self::PostPublished {
            channel,
            permalink: Some(permalink),
            post_id,
        }
    }

    pub fn post_failed_with_channel(
        channel: NoticeChannel,
        post_id: String,
        reason: FailureReason,
    ) -> Self {
        Self::PostFailed {
            channel: Some(channel),
            post_id,
            reason,
        }
    }

    pub fn post_unconfirmed_with_channel(channel: NoticeChannel, post_id: String) -> Self {
        Self::PostUnconfirmed {
            channel: Some(channel),
            post_id,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
