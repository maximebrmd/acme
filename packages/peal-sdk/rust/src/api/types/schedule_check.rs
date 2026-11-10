pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ScheduleCheck {
    Ok,
    InPast,
    InvalidTimeZone,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ScheduleCheck {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Ok => serializer.serialize_str("ok"),
            Self::InPast => serializer.serialize_str("inPast"),
            Self::InvalidTimeZone => serializer.serialize_str("invalidTimeZone"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ScheduleCheck {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "ok" => Ok(Self::Ok),
            "inPast" => Ok(Self::InPast),
            "invalidTimeZone" => Ok(Self::InvalidTimeZone),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ScheduleCheck {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Ok => write!(f, "ok"),
            Self::InPast => write!(f, "inPast"),
            Self::InvalidTimeZone => write!(f, "invalidTimeZone"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
