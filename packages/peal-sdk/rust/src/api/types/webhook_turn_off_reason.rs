pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum WebhookTurnOffReason {
    Failing,
    Gone,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for WebhookTurnOffReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Failing => serializer.serialize_str("failing"),
            Self::Gone => serializer.serialize_str("gone"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for WebhookTurnOffReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "failing" => Ok(Self::Failing),
            "gone" => Ok(Self::Gone),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for WebhookTurnOffReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Failing => write!(f, "failing"),
            Self::Gone => write!(f, "gone"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
