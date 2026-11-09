pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TikTokPrivacyLevel {
    PublicToEveryone,
    MutualFollowFriends,
    FollowerOfCreator,
    SelfOnly,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for TikTokPrivacyLevel {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::PublicToEveryone => serializer.serialize_str("PUBLIC_TO_EVERYONE"),
            Self::MutualFollowFriends => serializer.serialize_str("MUTUAL_FOLLOW_FRIENDS"),
            Self::FollowerOfCreator => serializer.serialize_str("FOLLOWER_OF_CREATOR"),
            Self::SelfOnly => serializer.serialize_str("SELF_ONLY"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for TikTokPrivacyLevel {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "PUBLIC_TO_EVERYONE" => Ok(Self::PublicToEveryone),
            "MUTUAL_FOLLOW_FRIENDS" => Ok(Self::MutualFollowFriends),
            "FOLLOWER_OF_CREATOR" => Ok(Self::FollowerOfCreator),
            "SELF_ONLY" => Ok(Self::SelfOnly),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for TikTokPrivacyLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::PublicToEveryone => write!(f, "PUBLIC_TO_EVERYONE"),
            Self::MutualFollowFriends => write!(f, "MUTUAL_FOLLOW_FRIENDS"),
            Self::FollowerOfCreator => write!(f, "FOLLOWER_OF_CREATOR"),
            Self::SelfOnly => write!(f, "SELF_ONLY"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
