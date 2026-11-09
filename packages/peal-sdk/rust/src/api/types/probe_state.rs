pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ProbeState {
    Pending,
    Unavailable,
    Unreadable,
    TimedOut,
    TooLarge,
    ToolFailed,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ProbeState {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Pending => serializer.serialize_str("pending"),
            Self::Unavailable => serializer.serialize_str("unavailable"),
            Self::Unreadable => serializer.serialize_str("unreadable"),
            Self::TimedOut => serializer.serialize_str("timedOut"),
            Self::TooLarge => serializer.serialize_str("tooLarge"),
            Self::ToolFailed => serializer.serialize_str("toolFailed"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ProbeState {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "pending" => Ok(Self::Pending),
            "unavailable" => Ok(Self::Unavailable),
            "unreadable" => Ok(Self::Unreadable),
            "timedOut" => Ok(Self::TimedOut),
            "tooLarge" => Ok(Self::TooLarge),
            "toolFailed" => Ok(Self::ToolFailed),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ProbeState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Pending => write!(f, "pending"),
            Self::Unavailable => write!(f, "unavailable"),
            Self::Unreadable => write!(f, "unreadable"),
            Self::TimedOut => write!(f, "timedOut"),
            Self::TooLarge => write!(f, "tooLarge"),
            Self::ToolFailed => write!(f, "toolFailed"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
