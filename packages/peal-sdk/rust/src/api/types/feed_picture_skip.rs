pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FeedPictureSkip {
    NotPublic,
    Unreachable,
    TooLarge,
    NotAnImage,
    StorageFull,
    Busy,
    NotAllowed,
    Failed,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FeedPictureSkip {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::NotPublic => serializer.serialize_str("notPublic"),
            Self::Unreachable => serializer.serialize_str("unreachable"),
            Self::TooLarge => serializer.serialize_str("tooLarge"),
            Self::NotAnImage => serializer.serialize_str("notAnImage"),
            Self::StorageFull => serializer.serialize_str("storageFull"),
            Self::Busy => serializer.serialize_str("busy"),
            Self::NotAllowed => serializer.serialize_str("notAllowed"),
            Self::Failed => serializer.serialize_str("failed"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FeedPictureSkip {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "notPublic" => Ok(Self::NotPublic),
            "unreachable" => Ok(Self::Unreachable),
            "tooLarge" => Ok(Self::TooLarge),
            "notAnImage" => Ok(Self::NotAnImage),
            "storageFull" => Ok(Self::StorageFull),
            "busy" => Ok(Self::Busy),
            "notAllowed" => Ok(Self::NotAllowed),
            "failed" => Ok(Self::Failed),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FeedPictureSkip {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotPublic => write!(f, "notPublic"),
            Self::Unreachable => write!(f, "unreachable"),
            Self::TooLarge => write!(f, "tooLarge"),
            Self::NotAnImage => write!(f, "notAnImage"),
            Self::StorageFull => write!(f, "storageFull"),
            Self::Busy => write!(f, "busy"),
            Self::NotAllowed => write!(f, "notAllowed"),
            Self::Failed => write!(f, "failed"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
