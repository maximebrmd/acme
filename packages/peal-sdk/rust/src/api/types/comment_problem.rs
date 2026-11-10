pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum CommentProblem {
    Text,
    Name,
    Email,
    Parent,
    Anchor,
    Selection,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for CommentProblem {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Text => serializer.serialize_str("text"),
            Self::Name => serializer.serialize_str("name"),
            Self::Email => serializer.serialize_str("email"),
            Self::Parent => serializer.serialize_str("parent"),
            Self::Anchor => serializer.serialize_str("anchor"),
            Self::Selection => serializer.serialize_str("selection"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for CommentProblem {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "text" => Ok(Self::Text),
            "name" => Ok(Self::Name),
            "email" => Ok(Self::Email),
            "parent" => Ok(Self::Parent),
            "anchor" => Ok(Self::Anchor),
            "selection" => Ok(Self::Selection),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for CommentProblem {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Text => write!(f, "text"),
            Self::Name => write!(f, "name"),
            Self::Email => write!(f, "email"),
            Self::Parent => write!(f, "parent"),
            Self::Anchor => write!(f, "anchor"),
            Self::Selection => write!(f, "selection"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
