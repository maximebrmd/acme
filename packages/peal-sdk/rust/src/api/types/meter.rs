pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Meter {
    AssistantRequests,
    AssistantImages,
    OutboundMessages,
    ManagedAds,
    XApi,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for Meter {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::AssistantRequests => serializer.serialize_str("assistantRequests"),
            Self::AssistantImages => serializer.serialize_str("assistantImages"),
            Self::OutboundMessages => serializer.serialize_str("outboundMessages"),
            Self::ManagedAds => serializer.serialize_str("managedAds"),
            Self::XApi => serializer.serialize_str("xApi"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for Meter {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "assistantRequests" => Ok(Self::AssistantRequests),
            "assistantImages" => Ok(Self::AssistantImages),
            "outboundMessages" => Ok(Self::OutboundMessages),
            "managedAds" => Ok(Self::ManagedAds),
            "xApi" => Ok(Self::XApi),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for Meter {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AssistantRequests => write!(f, "assistantRequests"),
            Self::AssistantImages => write!(f, "assistantImages"),
            Self::OutboundMessages => write!(f, "outboundMessages"),
            Self::ManagedAds => write!(f, "managedAds"),
            Self::XApi => write!(f, "xApi"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
