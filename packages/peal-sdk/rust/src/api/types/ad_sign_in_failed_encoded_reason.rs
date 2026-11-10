pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AdSignInFailedEncodedReason {
    Denied,
    Expired,
    Failed,
    NotConfigured,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AdSignInFailedEncodedReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Denied => serializer.serialize_str("denied"),
            Self::Expired => serializer.serialize_str("expired"),
            Self::Failed => serializer.serialize_str("failed"),
            Self::NotConfigured => serializer.serialize_str("notConfigured"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AdSignInFailedEncodedReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "denied" => Ok(Self::Denied),
            "expired" => Ok(Self::Expired),
            "failed" => Ok(Self::Failed),
            "notConfigured" => Ok(Self::NotConfigured),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AdSignInFailedEncodedReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Denied => write!(f, "denied"),
            Self::Expired => write!(f, "expired"),
            Self::Failed => write!(f, "failed"),
            Self::NotConfigured => write!(f, "notConfigured"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
