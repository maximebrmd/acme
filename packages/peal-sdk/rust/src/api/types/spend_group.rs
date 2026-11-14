pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum SpendGroup {
    Assistant,
    X,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for SpendGroup {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Assistant => serializer.serialize_str("assistant"),
            Self::X => serializer.serialize_str("x"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for SpendGroup {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "assistant" => Ok(Self::Assistant),
            "x" => Ok(Self::X),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for SpendGroup {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Assistant => write!(f, "assistant"),
            Self::X => write!(f, "x"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
