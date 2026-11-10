pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PostNotReviewableEncodedStatus {
    Published,
    Cancelled,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for PostNotReviewableEncodedStatus {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Published => serializer.serialize_str("published"),
            Self::Cancelled => serializer.serialize_str("cancelled"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for PostNotReviewableEncodedStatus {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "published" => Ok(Self::Published),
            "cancelled" => Ok(Self::Cancelled),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for PostNotReviewableEncodedStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Published => write!(f, "published"),
            Self::Cancelled => write!(f, "cancelled"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
