pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum InboxReplyStatus {
    Sending,
    Sent,
    Failed,
    Unconfirmed,
    Withdrawn,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for InboxReplyStatus {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Sending => serializer.serialize_str("sending"),
            Self::Sent => serializer.serialize_str("sent"),
            Self::Failed => serializer.serialize_str("failed"),
            Self::Unconfirmed => serializer.serialize_str("unconfirmed"),
            Self::Withdrawn => serializer.serialize_str("withdrawn"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for InboxReplyStatus {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "sending" => Ok(Self::Sending),
            "sent" => Ok(Self::Sent),
            "failed" => Ok(Self::Failed),
            "unconfirmed" => Ok(Self::Unconfirmed),
            "withdrawn" => Ok(Self::Withdrawn),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for InboxReplyStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Sending => write!(f, "sending"),
            Self::Sent => write!(f, "sent"),
            Self::Failed => write!(f, "failed"),
            Self::Unconfirmed => write!(f, "unconfirmed"),
            Self::Withdrawn => write!(f, "withdrawn"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
