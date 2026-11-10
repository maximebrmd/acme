pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum MediaTooLargeEncodedKind {
    Image,
    Video,
    Document,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for MediaTooLargeEncodedKind {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Image => serializer.serialize_str("image"),
            Self::Video => serializer.serialize_str("video"),
            Self::Document => serializer.serialize_str("document"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for MediaTooLargeEncodedKind {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "image" => Ok(Self::Image),
            "video" => Ok(Self::Video),
            "document" => Ok(Self::Document),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for MediaTooLargeEncodedKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Image => write!(f, "image"),
            Self::Video => write!(f, "video"),
            Self::Document => write!(f, "document"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
