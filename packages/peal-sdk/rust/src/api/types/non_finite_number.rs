pub use crate::prelude::*;

/// A number JSON cannot hold: infinity, negative infinity or not a number.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum NonFiniteNumber {
    Infinity,
    NaN,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for NonFiniteNumber {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Infinity => serializer.serialize_str("Infinity"),
            Self::NaN => serializer.serialize_str("NaN"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for NonFiniteNumber {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "Infinity" => Ok(Self::Infinity),
            "NaN" => Ok(Self::NaN),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for NonFiniteNumber {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Infinity => write!(f, "Infinity"),
            Self::NaN => write!(f, "NaN"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
