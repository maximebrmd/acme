pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FeedUnreadableEncodedReason {
    NotAFeed,
    TooLarge,
    Unreachable,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FeedUnreadableEncodedReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::NotAFeed => serializer.serialize_str("notAFeed"),
            Self::TooLarge => serializer.serialize_str("tooLarge"),
            Self::Unreachable => serializer.serialize_str("unreachable"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FeedUnreadableEncodedReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "notAFeed" => Ok(Self::NotAFeed),
            "tooLarge" => Ok(Self::TooLarge),
            "unreachable" => Ok(Self::Unreachable),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FeedUnreadableEncodedReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotAFeed => write!(f, "notAFeed"),
            Self::TooLarge => write!(f, "tooLarge"),
            Self::Unreachable => write!(f, "unreachable"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
