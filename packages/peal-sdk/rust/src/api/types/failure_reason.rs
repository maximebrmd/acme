pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FailureReason {
    ContentRejected,
    ChannelDisconnected,
    ChannelDisabled,
    MediaRemoved,
    MediaRejected,
    Missed,
    NotPublished,
    RateLimited,
    TokenExpired,
    Unavailable,
    AppNotAudited,
    QuotaExceeded,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FailureReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::ContentRejected => serializer.serialize_str("contentRejected"),
            Self::ChannelDisconnected => serializer.serialize_str("channelDisconnected"),
            Self::ChannelDisabled => serializer.serialize_str("channelDisabled"),
            Self::MediaRemoved => serializer.serialize_str("mediaRemoved"),
            Self::MediaRejected => serializer.serialize_str("mediaRejected"),
            Self::Missed => serializer.serialize_str("missed"),
            Self::NotPublished => serializer.serialize_str("notPublished"),
            Self::RateLimited => serializer.serialize_str("rateLimited"),
            Self::TokenExpired => serializer.serialize_str("tokenExpired"),
            Self::Unavailable => serializer.serialize_str("unavailable"),
            Self::AppNotAudited => serializer.serialize_str("appNotAudited"),
            Self::QuotaExceeded => serializer.serialize_str("quotaExceeded"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FailureReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "contentRejected" => Ok(Self::ContentRejected),
            "channelDisconnected" => Ok(Self::ChannelDisconnected),
            "channelDisabled" => Ok(Self::ChannelDisabled),
            "mediaRemoved" => Ok(Self::MediaRemoved),
            "mediaRejected" => Ok(Self::MediaRejected),
            "missed" => Ok(Self::Missed),
            "notPublished" => Ok(Self::NotPublished),
            "rateLimited" => Ok(Self::RateLimited),
            "tokenExpired" => Ok(Self::TokenExpired),
            "unavailable" => Ok(Self::Unavailable),
            "appNotAudited" => Ok(Self::AppNotAudited),
            "quotaExceeded" => Ok(Self::QuotaExceeded),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FailureReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ContentRejected => write!(f, "contentRejected"),
            Self::ChannelDisconnected => write!(f, "channelDisconnected"),
            Self::ChannelDisabled => write!(f, "channelDisabled"),
            Self::MediaRemoved => write!(f, "mediaRemoved"),
            Self::MediaRejected => write!(f, "mediaRejected"),
            Self::Missed => write!(f, "missed"),
            Self::NotPublished => write!(f, "notPublished"),
            Self::RateLimited => write!(f, "rateLimited"),
            Self::TokenExpired => write!(f, "tokenExpired"),
            Self::Unavailable => write!(f, "unavailable"),
            Self::AppNotAudited => write!(f, "appNotAudited"),
            Self::QuotaExceeded => write!(f, "quotaExceeded"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
