pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FeedStoppedReason {
    Unreachable,
    NotAFeed,
    Gone,
    StarterGone,
    QueueGone,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FeedStoppedReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Unreachable => serializer.serialize_str("unreachable"),
            Self::NotAFeed => serializer.serialize_str("notAFeed"),
            Self::Gone => serializer.serialize_str("gone"),
            Self::StarterGone => serializer.serialize_str("starterGone"),
            Self::QueueGone => serializer.serialize_str("queueGone"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FeedStoppedReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "unreachable" => Ok(Self::Unreachable),
            "notAFeed" => Ok(Self::NotAFeed),
            "gone" => Ok(Self::Gone),
            "starterGone" => Ok(Self::StarterGone),
            "queueGone" => Ok(Self::QueueGone),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FeedStoppedReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unreachable => write!(f, "unreachable"),
            Self::NotAFeed => write!(f, "notAFeed"),
            Self::Gone => write!(f, "gone"),
            Self::StarterGone => write!(f, "starterGone"),
            Self::QueueGone => write!(f, "queueGone"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
