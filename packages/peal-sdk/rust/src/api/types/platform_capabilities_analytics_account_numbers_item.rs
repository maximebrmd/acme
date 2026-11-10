pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PlatformCapabilitiesAnalyticsAccountNumbersItem {
    Followers,
    Following,
    Posts,
    Views,
    Reach,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for PlatformCapabilitiesAnalyticsAccountNumbersItem {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Followers => serializer.serialize_str("followers"),
            Self::Following => serializer.serialize_str("following"),
            Self::Posts => serializer.serialize_str("posts"),
            Self::Views => serializer.serialize_str("views"),
            Self::Reach => serializer.serialize_str("reach"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for PlatformCapabilitiesAnalyticsAccountNumbersItem {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "followers" => Ok(Self::Followers),
            "following" => Ok(Self::Following),
            "posts" => Ok(Self::Posts),
            "views" => Ok(Self::Views),
            "reach" => Ok(Self::Reach),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for PlatformCapabilitiesAnalyticsAccountNumbersItem {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Followers => write!(f, "followers"),
            Self::Following => write!(f, "following"),
            Self::Posts => write!(f, "posts"),
            Self::Views => write!(f, "views"),
            Self::Reach => write!(f, "reach"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
