pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum RecyclingUnit {
    Days,
    Weeks,
    Months,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for RecyclingUnit {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Days => serializer.serialize_str("days"),
            Self::Weeks => serializer.serialize_str("weeks"),
            Self::Months => serializer.serialize_str("months"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for RecyclingUnit {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "days" => Ok(Self::Days),
            "weeks" => Ok(Self::Weeks),
            "months" => Ok(Self::Months),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for RecyclingUnit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Days => write!(f, "days"),
            Self::Weeks => write!(f, "weeks"),
            Self::Months => write!(f, "months"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
