pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ReviewLinkAccess {
    View,
    Comment,
    Approve,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ReviewLinkAccess {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::View => serializer.serialize_str("view"),
            Self::Comment => serializer.serialize_str("comment"),
            Self::Approve => serializer.serialize_str("approve"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ReviewLinkAccess {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "view" => Ok(Self::View),
            "comment" => Ok(Self::Comment),
            "approve" => Ok(Self::Approve),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ReviewLinkAccess {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::View => write!(f, "view"),
            Self::Comment => write!(f, "comment"),
            Self::Approve => write!(f, "approve"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
