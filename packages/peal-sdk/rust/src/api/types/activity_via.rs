pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ActivityVia {
    Session,
    ApiKey,
    Oauth,
    Mcp,
    PartnerKey,
    ConnectLink,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ActivityVia {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Session => serializer.serialize_str("session"),
            Self::ApiKey => serializer.serialize_str("apiKey"),
            Self::Oauth => serializer.serialize_str("oauth"),
            Self::Mcp => serializer.serialize_str("mcp"),
            Self::PartnerKey => serializer.serialize_str("partnerKey"),
            Self::ConnectLink => serializer.serialize_str("connectLink"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ActivityVia {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "session" => Ok(Self::Session),
            "apiKey" => Ok(Self::ApiKey),
            "oauth" => Ok(Self::Oauth),
            "mcp" => Ok(Self::Mcp),
            "partnerKey" => Ok(Self::PartnerKey),
            "connectLink" => Ok(Self::ConnectLink),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ActivityVia {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Session => write!(f, "session"),
            Self::ApiKey => write!(f, "apiKey"),
            Self::Oauth => write!(f, "oauth"),
            Self::Mcp => write!(f, "mcp"),
            Self::PartnerKey => write!(f, "partnerKey"),
            Self::ConnectLink => write!(f, "connectLink"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
