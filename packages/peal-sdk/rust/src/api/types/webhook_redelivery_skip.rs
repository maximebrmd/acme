pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum WebhookRedeliverySkip {
    AlreadySent,
    EndpointDisabled,
    NotFound,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for WebhookRedeliverySkip {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::AlreadySent => serializer.serialize_str("alreadySent"),
            Self::EndpointDisabled => serializer.serialize_str("endpointDisabled"),
            Self::NotFound => serializer.serialize_str("notFound"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for WebhookRedeliverySkip {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "alreadySent" => Ok(Self::AlreadySent),
            "endpointDisabled" => Ok(Self::EndpointDisabled),
            "notFound" => Ok(Self::NotFound),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for WebhookRedeliverySkip {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AlreadySent => write!(f, "alreadySent"),
            Self::EndpointDisabled => write!(f, "endpointDisabled"),
            Self::NotFound => write!(f, "notFound"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
