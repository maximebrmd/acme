pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ReplyInvalidEncodedReason {
    Empty,
    TooLong,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ReplyInvalidEncodedReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Empty => serializer.serialize_str("empty"),
            Self::TooLong => serializer.serialize_str("tooLong"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ReplyInvalidEncodedReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "empty" => Ok(Self::Empty),
            "tooLong" => Ok(Self::TooLong),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ReplyInvalidEncodedReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty"),
            Self::TooLong => write!(f, "tooLong"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
