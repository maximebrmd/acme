pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum QueueNoRoom {
    NoSlots,
    Full,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for QueueNoRoom {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::NoSlots => serializer.serialize_str("noSlots"),
            Self::Full => serializer.serialize_str("full"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for QueueNoRoom {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "noSlots" => Ok(Self::NoSlots),
            "full" => Ok(Self::Full),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for QueueNoRoom {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NoSlots => write!(f, "noSlots"),
            Self::Full => write!(f, "full"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
