pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum WebhookDeliveryFailure {
    Exhausted,
    Gone,
    EndpointDisabled,
    NotConfigured,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for WebhookDeliveryFailure {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Exhausted => serializer.serialize_str("exhausted"),
            Self::Gone => serializer.serialize_str("gone"),
            Self::EndpointDisabled => serializer.serialize_str("endpointDisabled"),
            Self::NotConfigured => serializer.serialize_str("notConfigured"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for WebhookDeliveryFailure {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "exhausted" => Ok(Self::Exhausted),
            "gone" => Ok(Self::Gone),
            "endpointDisabled" => Ok(Self::EndpointDisabled),
            "notConfigured" => Ok(Self::NotConfigured),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for WebhookDeliveryFailure {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Exhausted => write!(f, "exhausted"),
            Self::Gone => write!(f, "gone"),
            Self::EndpointDisabled => write!(f, "endpointDisabled"),
            Self::NotConfigured => write!(f, "notConfigured"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
