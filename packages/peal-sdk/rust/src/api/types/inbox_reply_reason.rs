pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum InboxReplyReason {
    ChannelUnavailable,
    ReconnectNeeded,
    RateLimited,
    PlatformUnavailable,
    CommentGone,
    Refused,
    NotSent,
    TooLong,
    NoResponse,
    Interrupted,
    AdapterFailure,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for InboxReplyReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::ChannelUnavailable => serializer.serialize_str("channelUnavailable"),
            Self::ReconnectNeeded => serializer.serialize_str("reconnectNeeded"),
            Self::RateLimited => serializer.serialize_str("rateLimited"),
            Self::PlatformUnavailable => serializer.serialize_str("platformUnavailable"),
            Self::CommentGone => serializer.serialize_str("commentGone"),
            Self::Refused => serializer.serialize_str("refused"),
            Self::NotSent => serializer.serialize_str("notSent"),
            Self::TooLong => serializer.serialize_str("tooLong"),
            Self::NoResponse => serializer.serialize_str("noResponse"),
            Self::Interrupted => serializer.serialize_str("interrupted"),
            Self::AdapterFailure => serializer.serialize_str("adapterFailure"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for InboxReplyReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "channelUnavailable" => Ok(Self::ChannelUnavailable),
            "reconnectNeeded" => Ok(Self::ReconnectNeeded),
            "rateLimited" => Ok(Self::RateLimited),
            "platformUnavailable" => Ok(Self::PlatformUnavailable),
            "commentGone" => Ok(Self::CommentGone),
            "refused" => Ok(Self::Refused),
            "notSent" => Ok(Self::NotSent),
            "tooLong" => Ok(Self::TooLong),
            "noResponse" => Ok(Self::NoResponse),
            "interrupted" => Ok(Self::Interrupted),
            "adapterFailure" => Ok(Self::AdapterFailure),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for InboxReplyReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ChannelUnavailable => write!(f, "channelUnavailable"),
            Self::ReconnectNeeded => write!(f, "reconnectNeeded"),
            Self::RateLimited => write!(f, "rateLimited"),
            Self::PlatformUnavailable => write!(f, "platformUnavailable"),
            Self::CommentGone => write!(f, "commentGone"),
            Self::Refused => write!(f, "refused"),
            Self::NotSent => write!(f, "notSent"),
            Self::TooLong => write!(f, "tooLong"),
            Self::NoResponse => write!(f, "noResponse"),
            Self::Interrupted => write!(f, "interrupted"),
            Self::AdapterFailure => write!(f, "adapterFailure"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
