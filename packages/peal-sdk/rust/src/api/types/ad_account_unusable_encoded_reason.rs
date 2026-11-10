pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AdAccountUnusableEncodedReason {
    Status,
    ReconnectNeeded,
    Permission,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AdAccountUnusableEncodedReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Status => serializer.serialize_str("status"),
            Self::ReconnectNeeded => serializer.serialize_str("reconnectNeeded"),
            Self::Permission => serializer.serialize_str("permission"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AdAccountUnusableEncodedReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "status" => Ok(Self::Status),
            "reconnectNeeded" => Ok(Self::ReconnectNeeded),
            "permission" => Ok(Self::Permission),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AdAccountUnusableEncodedReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Status => write!(f, "status"),
            Self::ReconnectNeeded => write!(f, "reconnectNeeded"),
            Self::Permission => write!(f, "permission"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
