pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PostPartsNotSent {
    FirstComment,
    LaterParts,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for PostPartsNotSent {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::FirstComment => serializer.serialize_str("firstComment"),
            Self::LaterParts => serializer.serialize_str("laterParts"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for PostPartsNotSent {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "firstComment" => Ok(Self::FirstComment),
            "laterParts" => Ok(Self::LaterParts),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for PostPartsNotSent {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FirstComment => write!(f, "firstComment"),
            Self::LaterParts => write!(f, "laterParts"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
