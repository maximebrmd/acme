pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PlatformCapabilitiesAnalyticsPostCountsItem {
    Likes,
    Reposts,
    Replies,
    Quotes,
    Impressions,
    Clicks,
    Reach,
    Saves,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for PlatformCapabilitiesAnalyticsPostCountsItem {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Likes => serializer.serialize_str("likes"),
            Self::Reposts => serializer.serialize_str("reposts"),
            Self::Replies => serializer.serialize_str("replies"),
            Self::Quotes => serializer.serialize_str("quotes"),
            Self::Impressions => serializer.serialize_str("impressions"),
            Self::Clicks => serializer.serialize_str("clicks"),
            Self::Reach => serializer.serialize_str("reach"),
            Self::Saves => serializer.serialize_str("saves"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for PlatformCapabilitiesAnalyticsPostCountsItem {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "likes" => Ok(Self::Likes),
            "reposts" => Ok(Self::Reposts),
            "replies" => Ok(Self::Replies),
            "quotes" => Ok(Self::Quotes),
            "impressions" => Ok(Self::Impressions),
            "clicks" => Ok(Self::Clicks),
            "reach" => Ok(Self::Reach),
            "saves" => Ok(Self::Saves),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for PlatformCapabilitiesAnalyticsPostCountsItem {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Likes => write!(f, "likes"),
            Self::Reposts => write!(f, "reposts"),
            Self::Replies => write!(f, "replies"),
            Self::Quotes => write!(f, "quotes"),
            Self::Impressions => write!(f, "impressions"),
            Self::Clicks => write!(f, "clicks"),
            Self::Reach => write!(f, "reach"),
            Self::Saves => write!(f, "saves"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
