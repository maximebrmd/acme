pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ImageProviderAddressRefusal {
    Malformed,
    NotHttps,
    Credentials,
    QueryOrFragment,
    TooLong,
    NotPublic,
    UnknownHost,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ImageProviderAddressRefusal {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Malformed => serializer.serialize_str("malformed"),
            Self::NotHttps => serializer.serialize_str("notHttps"),
            Self::Credentials => serializer.serialize_str("credentials"),
            Self::QueryOrFragment => serializer.serialize_str("queryOrFragment"),
            Self::TooLong => serializer.serialize_str("tooLong"),
            Self::NotPublic => serializer.serialize_str("notPublic"),
            Self::UnknownHost => serializer.serialize_str("unknownHost"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ImageProviderAddressRefusal {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "malformed" => Ok(Self::Malformed),
            "notHttps" => Ok(Self::NotHttps),
            "credentials" => Ok(Self::Credentials),
            "queryOrFragment" => Ok(Self::QueryOrFragment),
            "tooLong" => Ok(Self::TooLong),
            "notPublic" => Ok(Self::NotPublic),
            "unknownHost" => Ok(Self::UnknownHost),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ImageProviderAddressRefusal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Malformed => write!(f, "malformed"),
            Self::NotHttps => write!(f, "notHttps"),
            Self::Credentials => write!(f, "credentials"),
            Self::QueryOrFragment => write!(f, "queryOrFragment"),
            Self::TooLong => write!(f, "tooLong"),
            Self::NotPublic => write!(f, "notPublic"),
            Self::UnknownHost => write!(f, "unknownHost"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
