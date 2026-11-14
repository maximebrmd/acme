pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TooManyRequestsEncodedPolicy {
    Default,
    Free,
    Override,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for TooManyRequestsEncodedPolicy {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Default => serializer.serialize_str("default"),
            Self::Free => serializer.serialize_str("free"),
            Self::Override => serializer.serialize_str("override"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for TooManyRequestsEncodedPolicy {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "default" => Ok(Self::Default),
            "free" => Ok(Self::Free),
            "override" => Ok(Self::Override),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for TooManyRequestsEncodedPolicy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Default => write!(f, "default"),
            Self::Free => write!(f, "free"),
            Self::Override => write!(f, "override"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
