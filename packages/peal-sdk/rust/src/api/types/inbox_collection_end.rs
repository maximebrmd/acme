pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum InboxCollectionEnd {
    Window,
    Disconnected,
    Unsupported,
    Missing,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for InboxCollectionEnd {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Window => serializer.serialize_str("window"),
            Self::Disconnected => serializer.serialize_str("disconnected"),
            Self::Unsupported => serializer.serialize_str("unsupported"),
            Self::Missing => serializer.serialize_str("missing"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for InboxCollectionEnd {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "window" => Ok(Self::Window),
            "disconnected" => Ok(Self::Disconnected),
            "unsupported" => Ok(Self::Unsupported),
            "missing" => Ok(Self::Missing),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for InboxCollectionEnd {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Window => write!(f, "window"),
            Self::Disconnected => write!(f, "disconnected"),
            Self::Unsupported => write!(f, "unsupported"),
            Self::Missing => write!(f, "missing"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
