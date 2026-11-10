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
    PostApprovalRequested,
    PostApproved,
    PostChangesRequested,
    ChannelConnected,
    ChannelDisconnected,
    ChannelReconnectNeeded,
    MediaReady,
    MediaFailed,
    CommentReceived,
    CommentReplied,
    BoostStarted,
    BoostPaused,
    BoostResumed,
    BoostStopped,
    BoostEnded,
    BoostFailed,
    BoostUnconfirmed,
    BoostBudgetReached,
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
            Self::PostApprovalRequested => serializer.serialize_str("post.approval_requested"),
            Self::PostApproved => serializer.serialize_str("post.approved"),
            Self::PostChangesRequested => serializer.serialize_str("post.changes_requested"),
            Self::ChannelConnected => serializer.serialize_str("channel.connected"),
            Self::ChannelDisconnected => serializer.serialize_str("channel.disconnected"),
            Self::ChannelReconnectNeeded => serializer.serialize_str("channel.reconnect_needed"),
            Self::MediaReady => serializer.serialize_str("media.ready"),
            Self::MediaFailed => serializer.serialize_str("media.failed"),
            Self::CommentReceived => serializer.serialize_str("comment.received"),
            Self::CommentReplied => serializer.serialize_str("comment.replied"),
            Self::BoostStarted => serializer.serialize_str("boost.started"),
            Self::BoostPaused => serializer.serialize_str("boost.paused"),
            Self::BoostResumed => serializer.serialize_str("boost.resumed"),
            Self::BoostStopped => serializer.serialize_str("boost.stopped"),
            Self::BoostEnded => serializer.serialize_str("boost.ended"),
            Self::BoostFailed => serializer.serialize_str("boost.failed"),
            Self::BoostUnconfirmed => serializer.serialize_str("boost.unconfirmed"),
            Self::BoostBudgetReached => serializer.serialize_str("boost.budget_reached"),
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
            "post.approval_requested" => Ok(Self::PostApprovalRequested),
            "post.approved" => Ok(Self::PostApproved),
            "post.changes_requested" => Ok(Self::PostChangesRequested),
            "channel.connected" => Ok(Self::ChannelConnected),
            "channel.disconnected" => Ok(Self::ChannelDisconnected),
            "channel.reconnect_needed" => Ok(Self::ChannelReconnectNeeded),
            "media.ready" => Ok(Self::MediaReady),
            "media.failed" => Ok(Self::MediaFailed),
            "comment.received" => Ok(Self::CommentReceived),
            "comment.replied" => Ok(Self::CommentReplied),
            "boost.started" => Ok(Self::BoostStarted),
            "boost.paused" => Ok(Self::BoostPaused),
            "boost.resumed" => Ok(Self::BoostResumed),
            "boost.stopped" => Ok(Self::BoostStopped),
            "boost.ended" => Ok(Self::BoostEnded),
            "boost.failed" => Ok(Self::BoostFailed),
            "boost.unconfirmed" => Ok(Self::BoostUnconfirmed),
            "boost.budget_reached" => Ok(Self::BoostBudgetReached),
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
            Self::PostApprovalRequested => write!(f, "post.approval_requested"),
            Self::PostApproved => write!(f, "post.approved"),
            Self::PostChangesRequested => write!(f, "post.changes_requested"),
            Self::ChannelConnected => write!(f, "channel.connected"),
            Self::ChannelDisconnected => write!(f, "channel.disconnected"),
            Self::ChannelReconnectNeeded => write!(f, "channel.reconnect_needed"),
            Self::MediaReady => write!(f, "media.ready"),
            Self::MediaFailed => write!(f, "media.failed"),
            Self::CommentReceived => write!(f, "comment.received"),
            Self::CommentReplied => write!(f, "comment.replied"),
            Self::BoostStarted => write!(f, "boost.started"),
            Self::BoostPaused => write!(f, "boost.paused"),
            Self::BoostResumed => write!(f, "boost.resumed"),
            Self::BoostStopped => write!(f, "boost.stopped"),
            Self::BoostEnded => write!(f, "boost.ended"),
            Self::BoostFailed => write!(f, "boost.failed"),
            Self::BoostUnconfirmed => write!(f, "boost.unconfirmed"),
            Self::BoostBudgetReached => write!(f, "boost.budget_reached"),
            Self::WebhookTest => write!(f, "webhook.test"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
