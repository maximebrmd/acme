pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum LivePostBlocker {
    NoApi,
    Permission,
    Unverified,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for LivePostBlocker {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::NoApi => serializer.serialize_str("noApi"),
            Self::Permission => serializer.serialize_str("permission"),
            Self::Unverified => serializer.serialize_str("unverified"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for LivePostBlocker {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "noApi" => Ok(Self::NoApi),
            "permission" => Ok(Self::Permission),
            "unverified" => Ok(Self::Unverified),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for LivePostBlocker {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NoApi => write!(f, "noApi"),
            Self::Permission => write!(f, "permission"),
            Self::Unverified => write!(f, "unverified"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
