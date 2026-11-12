pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FeedAddressRefusedEncodedReason {
    Credentials,
    Malformed,
    NotHttps,
    NotPublic,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FeedAddressRefusedEncodedReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Credentials => serializer.serialize_str("credentials"),
            Self::Malformed => serializer.serialize_str("malformed"),
            Self::NotHttps => serializer.serialize_str("notHttps"),
            Self::NotPublic => serializer.serialize_str("notPublic"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FeedAddressRefusedEncodedReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "credentials" => Ok(Self::Credentials),
            "malformed" => Ok(Self::Malformed),
            "notHttps" => Ok(Self::NotHttps),
            "notPublic" => Ok(Self::NotPublic),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FeedAddressRefusedEncodedReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Credentials => write!(f, "credentials"),
            Self::Malformed => write!(f, "malformed"),
            Self::NotHttps => write!(f, "notHttps"),
            Self::NotPublic => write!(f, "notPublic"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
