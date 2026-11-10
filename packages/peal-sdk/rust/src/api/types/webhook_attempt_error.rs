pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum WebhookAttemptError {
    Timeout,
    Connection,
    Refused,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for WebhookAttemptError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Timeout => serializer.serialize_str("timeout"),
            Self::Connection => serializer.serialize_str("connection"),
            Self::Refused => serializer.serialize_str("refused"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for WebhookAttemptError {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "timeout" => Ok(Self::Timeout),
            "connection" => Ok(Self::Connection),
            "refused" => Ok(Self::Refused),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for WebhookAttemptError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Timeout => write!(f, "timeout"),
            Self::Connection => write!(f, "connection"),
            Self::Refused => write!(f, "refused"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
