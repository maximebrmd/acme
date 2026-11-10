pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ApprovalStatus {
    Pending,
    Approved,
    ChangesRequested,
    Withdrawn,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ApprovalStatus {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Pending => serializer.serialize_str("pending"),
            Self::Approved => serializer.serialize_str("approved"),
            Self::ChangesRequested => serializer.serialize_str("changesRequested"),
            Self::Withdrawn => serializer.serialize_str("withdrawn"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ApprovalStatus {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "pending" => Ok(Self::Pending),
            "approved" => Ok(Self::Approved),
            "changesRequested" => Ok(Self::ChangesRequested),
            "withdrawn" => Ok(Self::Withdrawn),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ApprovalStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Pending => write!(f, "pending"),
            Self::Approved => write!(f, "approved"),
            Self::ChangesRequested => write!(f, "changesRequested"),
            Self::Withdrawn => write!(f, "withdrawn"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
