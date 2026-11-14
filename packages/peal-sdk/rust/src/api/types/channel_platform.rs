pub use crate::prelude::*;

/// What a channel connects to: a social network (posts) or a website (articles).
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ChannelPlatform {
    X,
    Linkedin,
    Bluesky,
    Mastodon,
    Threads,
    Instagram,
    Facebook,
    Tiktok,
    Youtube,
    Pinterest,
    GoogleBusiness,
    Wordpress,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ChannelPlatform {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::X => serializer.serialize_str("x"),
            Self::Linkedin => serializer.serialize_str("linkedin"),
            Self::Bluesky => serializer.serialize_str("bluesky"),
            Self::Mastodon => serializer.serialize_str("mastodon"),
            Self::Threads => serializer.serialize_str("threads"),
            Self::Instagram => serializer.serialize_str("instagram"),
            Self::Facebook => serializer.serialize_str("facebook"),
            Self::Tiktok => serializer.serialize_str("tiktok"),
            Self::Youtube => serializer.serialize_str("youtube"),
            Self::Pinterest => serializer.serialize_str("pinterest"),
            Self::GoogleBusiness => serializer.serialize_str("googleBusiness"),
            Self::Wordpress => serializer.serialize_str("wordpress"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ChannelPlatform {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "x" => Ok(Self::X),
            "linkedin" => Ok(Self::Linkedin),
            "bluesky" => Ok(Self::Bluesky),
            "mastodon" => Ok(Self::Mastodon),
            "threads" => Ok(Self::Threads),
            "instagram" => Ok(Self::Instagram),
            "facebook" => Ok(Self::Facebook),
            "tiktok" => Ok(Self::Tiktok),
            "youtube" => Ok(Self::Youtube),
            "pinterest" => Ok(Self::Pinterest),
            "googleBusiness" => Ok(Self::GoogleBusiness),
            "wordpress" => Ok(Self::Wordpress),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ChannelPlatform {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::X => write!(f, "x"),
            Self::Linkedin => write!(f, "linkedin"),
            Self::Bluesky => write!(f, "bluesky"),
            Self::Mastodon => write!(f, "mastodon"),
            Self::Threads => write!(f, "threads"),
            Self::Instagram => write!(f, "instagram"),
            Self::Facebook => write!(f, "facebook"),
            Self::Tiktok => write!(f, "tiktok"),
            Self::Youtube => write!(f, "youtube"),
            Self::Pinterest => write!(f, "pinterest"),
            Self::GoogleBusiness => write!(f, "googleBusiness"),
            Self::Wordpress => write!(f, "wordpress"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
