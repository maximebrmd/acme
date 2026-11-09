pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AssistantFailedEncodedReason {
    Unreachable,
    TimedOut,
    Declined,
    InvalidAnswer,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AssistantFailedEncodedReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Unreachable => serializer.serialize_str("unreachable"),
            Self::TimedOut => serializer.serialize_str("timedOut"),
            Self::Declined => serializer.serialize_str("declined"),
            Self::InvalidAnswer => serializer.serialize_str("invalidAnswer"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AssistantFailedEncodedReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "unreachable" => Ok(Self::Unreachable),
            "timedOut" => Ok(Self::TimedOut),
            "declined" => Ok(Self::Declined),
            "invalidAnswer" => Ok(Self::InvalidAnswer),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AssistantFailedEncodedReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unreachable => write!(f, "unreachable"),
            Self::TimedOut => write!(f, "timedOut"),
            Self::Declined => write!(f, "declined"),
            Self::InvalidAnswer => write!(f, "invalidAnswer"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
