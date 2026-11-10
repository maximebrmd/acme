pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum GoogleBusinessPostType {
    Standard,
    Event,
    Offer,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for GoogleBusinessPostType {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Standard => serializer.serialize_str("standard"),
            Self::Event => serializer.serialize_str("event"),
            Self::Offer => serializer.serialize_str("offer"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for GoogleBusinessPostType {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "standard" => Ok(Self::Standard),
            "event" => Ok(Self::Event),
            "offer" => Ok(Self::Offer),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for GoogleBusinessPostType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Standard => write!(f, "standard"),
            Self::Event => write!(f, "event"),
            Self::Offer => write!(f, "offer"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
