pub use crate::prelude::*;

/// An event Peal sends to webhook endpoints.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum WebhookEventType {
    PostScheduled,
    PostUnscheduled,
    PostPublished,
    PostFailed,
    PostUnconfirmed,
    PostCancelled,
    ChannelConnected,
    ChannelDisconnected,
    ChannelReconnectNeeded,
    MediaReady,
    MediaFailed,
    WebhookTest,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for WebhookEventType {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::PostScheduled => serializer.serialize_str("post.scheduled"),
            Self::PostUnscheduled => serializer.serialize_str("post.unscheduled"),
            Self::PostPublished => serializer.serialize_str("post.published"),
            Self::PostFailed => serializer.serialize_str("post.failed"),
            Self::PostUnconfirmed => serializer.serialize_str("post.unconfirmed"),
            Self::PostCancelled => serializer.serialize_str("post.cancelled"),
            Self::ChannelConnected => serializer.serialize_str("channel.connected"),
            Self::ChannelDisconnected => serializer.serialize_str("channel.disconnected"),
            Self::ChannelReconnectNeeded => serializer.serialize_str("channel.reconnect_needed"),
            Self::MediaReady => serializer.serialize_str("media.ready"),
            Self::MediaFailed => serializer.serialize_str("media.failed"),
            Self::WebhookTest => serializer.serialize_str("webhook.test"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for WebhookEventType {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "post.scheduled" => Ok(Self::PostScheduled),
            "post.unscheduled" => Ok(Self::PostUnscheduled),
            "post.published" => Ok(Self::PostPublished),
            "post.failed" => Ok(Self::PostFailed),
            "post.unconfirmed" => Ok(Self::PostUnconfirmed),
            "post.cancelled" => Ok(Self::PostCancelled),
            "channel.connected" => Ok(Self::ChannelConnected),
            "channel.disconnected" => Ok(Self::ChannelDisconnected),
            "channel.reconnect_needed" => Ok(Self::ChannelReconnectNeeded),
            "media.ready" => Ok(Self::MediaReady),
            "media.failed" => Ok(Self::MediaFailed),
            "webhook.test" => Ok(Self::WebhookTest),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for WebhookEventType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::PostScheduled => write!(f, "post.scheduled"),
            Self::PostUnscheduled => write!(f, "post.unscheduled"),
            Self::PostPublished => write!(f, "post.published"),
            Self::PostFailed => write!(f, "post.failed"),
            Self::PostUnconfirmed => write!(f, "post.unconfirmed"),
            Self::PostCancelled => write!(f, "post.cancelled"),
            Self::ChannelConnected => write!(f, "channel.connected"),
            Self::ChannelDisconnected => write!(f, "channel.disconnected"),
            Self::ChannelReconnectNeeded => write!(f, "channel.reconnect_needed"),
            Self::MediaReady => write!(f, "media.ready"),
            Self::MediaFailed => write!(f, "media.failed"),
            Self::WebhookTest => write!(f, "webhook.test"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
