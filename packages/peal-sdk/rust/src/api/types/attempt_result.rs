pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AttemptResult {
    Published,
    Unconfirmed,
    ContentRejected,
    ChannelDisconnected,
    ChannelDisabled,
    MediaRemoved,
    MediaRejected,
    RateLimited,
    TokenExpired,
    Unavailable,
    AppNotAudited,
    QuotaExceeded,
    AppBillingLimit,
    PlanLimit,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AttemptResult {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Published => serializer.serialize_str("published"),
            Self::Unconfirmed => serializer.serialize_str("unconfirmed"),
            Self::ContentRejected => serializer.serialize_str("contentRejected"),
            Self::ChannelDisconnected => serializer.serialize_str("channelDisconnected"),
            Self::ChannelDisabled => serializer.serialize_str("channelDisabled"),
            Self::MediaRemoved => serializer.serialize_str("mediaRemoved"),
            Self::MediaRejected => serializer.serialize_str("mediaRejected"),
            Self::RateLimited => serializer.serialize_str("rateLimited"),
            Self::TokenExpired => serializer.serialize_str("tokenExpired"),
            Self::Unavailable => serializer.serialize_str("unavailable"),
            Self::AppNotAudited => serializer.serialize_str("appNotAudited"),
            Self::QuotaExceeded => serializer.serialize_str("quotaExceeded"),
            Self::AppBillingLimit => serializer.serialize_str("appBillingLimit"),
            Self::PlanLimit => serializer.serialize_str("planLimit"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AttemptResult {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "published" => Ok(Self::Published),
            "unconfirmed" => Ok(Self::Unconfirmed),
            "contentRejected" => Ok(Self::ContentRejected),
            "channelDisconnected" => Ok(Self::ChannelDisconnected),
            "channelDisabled" => Ok(Self::ChannelDisabled),
            "mediaRemoved" => Ok(Self::MediaRemoved),
            "mediaRejected" => Ok(Self::MediaRejected),
            "rateLimited" => Ok(Self::RateLimited),
            "tokenExpired" => Ok(Self::TokenExpired),
            "unavailable" => Ok(Self::Unavailable),
            "appNotAudited" => Ok(Self::AppNotAudited),
            "quotaExceeded" => Ok(Self::QuotaExceeded),
            "appBillingLimit" => Ok(Self::AppBillingLimit),
            "planLimit" => Ok(Self::PlanLimit),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AttemptResult {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Published => write!(f, "published"),
            Self::Unconfirmed => write!(f, "unconfirmed"),
            Self::ContentRejected => write!(f, "contentRejected"),
            Self::ChannelDisconnected => write!(f, "channelDisconnected"),
            Self::ChannelDisabled => write!(f, "channelDisabled"),
            Self::MediaRemoved => write!(f, "mediaRemoved"),
            Self::MediaRejected => write!(f, "mediaRejected"),
            Self::RateLimited => write!(f, "rateLimited"),
            Self::TokenExpired => write!(f, "tokenExpired"),
            Self::Unavailable => write!(f, "unavailable"),
            Self::AppNotAudited => write!(f, "appNotAudited"),
            Self::QuotaExceeded => write!(f, "quotaExceeded"),
            Self::AppBillingLimit => write!(f, "appBillingLimit"),
            Self::PlanLimit => write!(f, "planLimit"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
