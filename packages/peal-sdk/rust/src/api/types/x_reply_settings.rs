pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum XReplySettings {
    Following,
    MentionedUsers,
    Subscribers,
    Verified,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for XReplySettings {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Following => serializer.serialize_str("following"),
            Self::MentionedUsers => serializer.serialize_str("mentionedUsers"),
            Self::Subscribers => serializer.serialize_str("subscribers"),
            Self::Verified => serializer.serialize_str("verified"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for XReplySettings {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "following" => Ok(Self::Following),
            "mentionedUsers" => Ok(Self::MentionedUsers),
            "subscribers" => Ok(Self::Subscribers),
            "verified" => Ok(Self::Verified),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for XReplySettings {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Following => write!(f, "following"),
            Self::MentionedUsers => write!(f, "mentionedUsers"),
            Self::Subscribers => write!(f, "subscribers"),
            Self::Verified => write!(f, "verified"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
