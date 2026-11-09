pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TikTokBlock {
    PostLimit,
    Banned,
    ClientLimit,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for TikTokBlock {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::PostLimit => serializer.serialize_str("postLimit"),
            Self::Banned => serializer.serialize_str("banned"),
            Self::ClientLimit => serializer.serialize_str("clientLimit"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for TikTokBlock {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "postLimit" => Ok(Self::PostLimit),
            "banned" => Ok(Self::Banned),
            "clientLimit" => Ok(Self::ClientLimit),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for TikTokBlock {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::PostLimit => write!(f, "postLimit"),
            Self::Banned => write!(f, "banned"),
            Self::ClientLimit => write!(f, "clientLimit"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
