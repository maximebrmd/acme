pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum InboxModerationAction {
    Hide,
    Unhide,
    Like,
    Unlike,
    Delete,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for InboxModerationAction {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Hide => serializer.serialize_str("hide"),
            Self::Unhide => serializer.serialize_str("unhide"),
            Self::Like => serializer.serialize_str("like"),
            Self::Unlike => serializer.serialize_str("unlike"),
            Self::Delete => serializer.serialize_str("delete"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for InboxModerationAction {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "hide" => Ok(Self::Hide),
            "unhide" => Ok(Self::Unhide),
            "like" => Ok(Self::Like),
            "unlike" => Ok(Self::Unlike),
            "delete" => Ok(Self::Delete),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for InboxModerationAction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Hide => write!(f, "hide"),
            Self::Unhide => write!(f, "unhide"),
            Self::Like => write!(f, "like"),
            Self::Unlike => write!(f, "unlike"),
            Self::Delete => write!(f, "delete"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
