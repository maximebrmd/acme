pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PostSort {
    CreatedDesc,
    CreatedAsc,
    ScheduledDesc,
    ScheduledAsc,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for PostSort {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::CreatedDesc => serializer.serialize_str("createdDesc"),
            Self::CreatedAsc => serializer.serialize_str("createdAsc"),
            Self::ScheduledDesc => serializer.serialize_str("scheduledDesc"),
            Self::ScheduledAsc => serializer.serialize_str("scheduledAsc"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for PostSort {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "createdDesc" => Ok(Self::CreatedDesc),
            "createdAsc" => Ok(Self::CreatedAsc),
            "scheduledDesc" => Ok(Self::ScheduledDesc),
            "scheduledAsc" => Ok(Self::ScheduledAsc),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for PostSort {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CreatedDesc => write!(f, "createdDesc"),
            Self::CreatedAsc => write!(f, "createdAsc"),
            Self::ScheduledDesc => write!(f, "scheduledDesc"),
            Self::ScheduledAsc => write!(f, "scheduledAsc"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
