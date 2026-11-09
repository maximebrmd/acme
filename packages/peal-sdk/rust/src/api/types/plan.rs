pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Plan {
    Free,
    Pro,
    Business,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for Plan {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Free => serializer.serialize_str("free"),
            Self::Pro => serializer.serialize_str("pro"),
            Self::Business => serializer.serialize_str("business"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for Plan {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "free" => Ok(Self::Free),
            "pro" => Ok(Self::Pro),
            "business" => Ok(Self::Business),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for Plan {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Free => write!(f, "free"),
            Self::Pro => write!(f, "pro"),
            Self::Business => write!(f, "business"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
