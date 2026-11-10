pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PostStatus {
    Draft,
    AwaitingApproval,
    Scheduled,
    Publishing,
    Finished,
    Cancelled,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for PostStatus {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Draft => serializer.serialize_str("draft"),
            Self::AwaitingApproval => serializer.serialize_str("awaitingApproval"),
            Self::Scheduled => serializer.serialize_str("scheduled"),
            Self::Publishing => serializer.serialize_str("publishing"),
            Self::Finished => serializer.serialize_str("finished"),
            Self::Cancelled => serializer.serialize_str("cancelled"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for PostStatus {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "draft" => Ok(Self::Draft),
            "awaitingApproval" => Ok(Self::AwaitingApproval),
            "scheduled" => Ok(Self::Scheduled),
            "publishing" => Ok(Self::Publishing),
            "finished" => Ok(Self::Finished),
            "cancelled" => Ok(Self::Cancelled),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for PostStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Draft => write!(f, "draft"),
            Self::AwaitingApproval => write!(f, "awaitingApproval"),
            Self::Scheduled => write!(f, "scheduled"),
            Self::Publishing => write!(f, "publishing"),
            Self::Finished => write!(f, "finished"),
            Self::Cancelled => write!(f, "cancelled"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
