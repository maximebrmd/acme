pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AccountUnreadReason {
    Disabled,
    Disconnected,
    PlatformUnreachable,
    RateLimited,
    Reconnect,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AccountUnreadReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Disabled => serializer.serialize_str("disabled"),
            Self::Disconnected => serializer.serialize_str("disconnected"),
            Self::PlatformUnreachable => serializer.serialize_str("platformUnreachable"),
            Self::RateLimited => serializer.serialize_str("rateLimited"),
            Self::Reconnect => serializer.serialize_str("reconnect"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AccountUnreadReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "disabled" => Ok(Self::Disabled),
            "disconnected" => Ok(Self::Disconnected),
            "platformUnreachable" => Ok(Self::PlatformUnreachable),
            "rateLimited" => Ok(Self::RateLimited),
            "reconnect" => Ok(Self::Reconnect),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AccountUnreadReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Disabled => write!(f, "disabled"),
            Self::Disconnected => write!(f, "disconnected"),
            Self::PlatformUnreachable => write!(f, "platformUnreachable"),
            Self::RateLimited => write!(f, "rateLimited"),
            Self::Reconnect => write!(f, "reconnect"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
