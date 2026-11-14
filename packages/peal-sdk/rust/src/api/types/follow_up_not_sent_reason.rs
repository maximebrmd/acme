pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FollowUpNotSentReason {
    Failed,
    Unconfirmed,
    WindowEnded,
    NotGranted,
    NotApproved,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FollowUpNotSentReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Failed => serializer.serialize_str("failed"),
            Self::Unconfirmed => serializer.serialize_str("unconfirmed"),
            Self::WindowEnded => serializer.serialize_str("windowEnded"),
            Self::NotGranted => serializer.serialize_str("notGranted"),
            Self::NotApproved => serializer.serialize_str("notApproved"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FollowUpNotSentReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "failed" => Ok(Self::Failed),
            "unconfirmed" => Ok(Self::Unconfirmed),
            "windowEnded" => Ok(Self::WindowEnded),
            "notGranted" => Ok(Self::NotGranted),
            "notApproved" => Ok(Self::NotApproved),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FollowUpNotSentReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Failed => write!(f, "failed"),
            Self::Unconfirmed => write!(f, "unconfirmed"),
            Self::WindowEnded => write!(f, "windowEnded"),
            Self::NotGranted => write!(f, "notGranted"),
            Self::NotApproved => write!(f, "notApproved"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
