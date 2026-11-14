pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FollowUpKind {
    Comment,
    Repost,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FollowUpKind {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Comment => serializer.serialize_str("comment"),
            Self::Repost => serializer.serialize_str("repost"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FollowUpKind {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "comment" => Ok(Self::Comment),
            "repost" => Ok(Self::Repost),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FollowUpKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Comment => write!(f, "comment"),
            Self::Repost => write!(f, "repost"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
