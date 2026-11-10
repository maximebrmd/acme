pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum WebhookEndpointScope {
    Workspace,
    Partner,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for WebhookEndpointScope {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Workspace => serializer.serialize_str("workspace"),
            Self::Partner => serializer.serialize_str("partner"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for WebhookEndpointScope {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "workspace" => Ok(Self::Workspace),
            "partner" => Ok(Self::Partner),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for WebhookEndpointScope {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Workspace => write!(f, "workspace"),
            Self::Partner => write!(f, "partner"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
