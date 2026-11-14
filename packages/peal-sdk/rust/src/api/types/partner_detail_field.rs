pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PartnerDetailField {
    Name,
    LogoUrl,
    AccentColor,
    ReturnOrigins,
    ExternalId,
    Permissions,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for PartnerDetailField {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Name => serializer.serialize_str("name"),
            Self::LogoUrl => serializer.serialize_str("logoUrl"),
            Self::AccentColor => serializer.serialize_str("accentColor"),
            Self::ReturnOrigins => serializer.serialize_str("returnOrigins"),
            Self::ExternalId => serializer.serialize_str("externalId"),
            Self::Permissions => serializer.serialize_str("permissions"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for PartnerDetailField {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "name" => Ok(Self::Name),
            "logoUrl" => Ok(Self::LogoUrl),
            "accentColor" => Ok(Self::AccentColor),
            "returnOrigins" => Ok(Self::ReturnOrigins),
            "externalId" => Ok(Self::ExternalId),
            "permissions" => Ok(Self::Permissions),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for PartnerDetailField {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Name => write!(f, "name"),
            Self::LogoUrl => write!(f, "logoUrl"),
            Self::AccentColor => write!(f, "accentColor"),
            Self::ReturnOrigins => write!(f, "returnOrigins"),
            Self::ExternalId => write!(f, "externalId"),
            Self::Permissions => write!(f, "permissions"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
