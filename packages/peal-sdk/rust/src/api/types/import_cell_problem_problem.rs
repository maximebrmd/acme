pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ImportCellProblemProblem {
    Missing,
    Invalid,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ImportCellProblemProblem {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Missing => serializer.serialize_str("missing"),
            Self::Invalid => serializer.serialize_str("invalid"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ImportCellProblemProblem {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "missing" => Ok(Self::Missing),
            "invalid" => Ok(Self::Invalid),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ImportCellProblemProblem {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Missing => write!(f, "missing"),
            Self::Invalid => write!(f, "invalid"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
