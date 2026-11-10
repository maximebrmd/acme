pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ReviewLinkStatus {
    Active,
    Expired,
    Revoked,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ReviewLinkStatus {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Active => serializer.serialize_str("active"),
            Self::Expired => serializer.serialize_str("expired"),
            Self::Revoked => serializer.serialize_str("revoked"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ReviewLinkStatus {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "active" => Ok(Self::Active),
            "expired" => Ok(Self::Expired),
            "revoked" => Ok(Self::Revoked),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ReviewLinkStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::Expired => write!(f, "expired"),
            Self::Revoked => write!(f, "revoked"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
