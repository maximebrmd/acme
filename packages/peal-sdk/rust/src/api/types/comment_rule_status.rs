pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum CommentRuleStatus {
    Active,
    Paused,
    Ended,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for CommentRuleStatus {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Active => serializer.serialize_str("active"),
            Self::Paused => serializer.serialize_str("paused"),
            Self::Ended => serializer.serialize_str("ended"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for CommentRuleStatus {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "active" => Ok(Self::Active),
            "paused" => Ok(Self::Paused),
            "ended" => Ok(Self::Ended),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for CommentRuleStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::Paused => write!(f, "paused"),
            Self::Ended => write!(f, "ended"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
