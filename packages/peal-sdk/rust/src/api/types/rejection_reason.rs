pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum RejectionReason {
    SizeMismatch,
    TypeMismatch,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for RejectionReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::SizeMismatch => serializer.serialize_str("sizeMismatch"),
            Self::TypeMismatch => serializer.serialize_str("typeMismatch"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for RejectionReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "sizeMismatch" => Ok(Self::SizeMismatch),
            "typeMismatch" => Ok(Self::TypeMismatch),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for RejectionReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SizeMismatch => write!(f, "sizeMismatch"),
            Self::TypeMismatch => write!(f, "typeMismatch"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
