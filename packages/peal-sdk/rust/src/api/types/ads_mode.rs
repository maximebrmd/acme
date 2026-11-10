pub use crate::prelude::*;

/// What the server offers of ads: `off` nothing, `read` connecting ad accounts and reading their campaigns and numbers, `spend` boosting too.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AdsMode {
    Off,
    Read,
    Spend,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AdsMode {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Off => serializer.serialize_str("off"),
            Self::Read => serializer.serialize_str("read"),
            Self::Spend => serializer.serialize_str("spend"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AdsMode {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "off" => Ok(Self::Off),
            "read" => Ok(Self::Read),
            "spend" => Ok(Self::Spend),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AdsMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Off => write!(f, "off"),
            Self::Read => write!(f, "read"),
            Self::Spend => write!(f, "spend"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
