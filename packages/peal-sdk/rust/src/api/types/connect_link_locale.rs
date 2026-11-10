pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ConnectLinkLocale {
    En,
    Fr,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ConnectLinkLocale {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::En => serializer.serialize_str("en"),
            Self::Fr => serializer.serialize_str("fr"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ConnectLinkLocale {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "en" => Ok(Self::En),
            "fr" => Ok(Self::Fr),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ConnectLinkLocale {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::En => write!(f, "en"),
            Self::Fr => write!(f, "fr"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
