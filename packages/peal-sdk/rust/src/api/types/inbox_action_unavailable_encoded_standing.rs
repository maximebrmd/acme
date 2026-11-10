pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum InboxActionUnavailableEncodedStanding {
    Reconnect,
    Unsupported,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for InboxActionUnavailableEncodedStanding {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Reconnect => serializer.serialize_str("reconnect"),
            Self::Unsupported => serializer.serialize_str("unsupported"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for InboxActionUnavailableEncodedStanding {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "reconnect" => Ok(Self::Reconnect),
            "unsupported" => Ok(Self::Unsupported),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for InboxActionUnavailableEncodedStanding {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Reconnect => write!(f, "reconnect"),
            Self::Unsupported => write!(f, "unsupported"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
