pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum SiteNotConnectedReason {
    NotWordPress,
    AddressNotAllowed,
    CredentialsRefused,
    CannotPublish,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for SiteNotConnectedReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::NotWordPress => serializer.serialize_str("notWordPress"),
            Self::AddressNotAllowed => serializer.serialize_str("addressNotAllowed"),
            Self::CredentialsRefused => serializer.serialize_str("credentialsRefused"),
            Self::CannotPublish => serializer.serialize_str("cannotPublish"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for SiteNotConnectedReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "notWordPress" => Ok(Self::NotWordPress),
            "addressNotAllowed" => Ok(Self::AddressNotAllowed),
            "credentialsRefused" => Ok(Self::CredentialsRefused),
            "cannotPublish" => Ok(Self::CannotPublish),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for SiteNotConnectedReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotWordPress => write!(f, "notWordPress"),
            Self::AddressNotAllowed => write!(f, "addressNotAllowed"),
            Self::CredentialsRefused => write!(f, "credentialsRefused"),
            Self::CannotPublish => write!(f, "cannotPublish"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
