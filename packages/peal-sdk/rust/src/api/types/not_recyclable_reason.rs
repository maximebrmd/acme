pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum NotRecyclableReason {
    Draft,
    AwaitingApproval,
    Cancelled,
    Repeating,
    Occurrence,
    NoChannels,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for NotRecyclableReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Draft => serializer.serialize_str("draft"),
            Self::AwaitingApproval => serializer.serialize_str("awaitingApproval"),
            Self::Cancelled => serializer.serialize_str("cancelled"),
            Self::Repeating => serializer.serialize_str("repeating"),
            Self::Occurrence => serializer.serialize_str("occurrence"),
            Self::NoChannels => serializer.serialize_str("noChannels"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for NotRecyclableReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "draft" => Ok(Self::Draft),
            "awaitingApproval" => Ok(Self::AwaitingApproval),
            "cancelled" => Ok(Self::Cancelled),
            "repeating" => Ok(Self::Repeating),
            "occurrence" => Ok(Self::Occurrence),
            "noChannels" => Ok(Self::NoChannels),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for NotRecyclableReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Draft => write!(f, "draft"),
            Self::AwaitingApproval => write!(f, "awaitingApproval"),
            Self::Cancelled => write!(f, "cancelled"),
            Self::Repeating => write!(f, "repeating"),
            Self::Occurrence => write!(f, "occurrence"),
            Self::NoChannels => write!(f, "noChannels"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
