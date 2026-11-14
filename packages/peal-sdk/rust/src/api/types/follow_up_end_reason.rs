pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FollowUpEndReason {
    Stopped,
    Completed,
    StarterGone,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FollowUpEndReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Stopped => serializer.serialize_str("stopped"),
            Self::Completed => serializer.serialize_str("completed"),
            Self::StarterGone => serializer.serialize_str("starterGone"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FollowUpEndReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "stopped" => Ok(Self::Stopped),
            "completed" => Ok(Self::Completed),
            "starterGone" => Ok(Self::StarterGone),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FollowUpEndReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Stopped => write!(f, "stopped"),
            Self::Completed => write!(f, "completed"),
            Self::StarterGone => write!(f, "starterGone"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
