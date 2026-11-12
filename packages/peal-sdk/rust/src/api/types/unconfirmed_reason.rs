pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum UnconfirmedReason {
    NoResponse,
    UnreadableResponse,
    Interrupted,
    AdapterFailure,
    StillProcessing,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for UnconfirmedReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::NoResponse => serializer.serialize_str("noResponse"),
            Self::UnreadableResponse => serializer.serialize_str("unreadableResponse"),
            Self::Interrupted => serializer.serialize_str("interrupted"),
            Self::AdapterFailure => serializer.serialize_str("adapterFailure"),
            Self::StillProcessing => serializer.serialize_str("stillProcessing"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for UnconfirmedReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "noResponse" => Ok(Self::NoResponse),
            "unreadableResponse" => Ok(Self::UnreadableResponse),
            "interrupted" => Ok(Self::Interrupted),
            "adapterFailure" => Ok(Self::AdapterFailure),
            "stillProcessing" => Ok(Self::StillProcessing),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for UnconfirmedReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NoResponse => write!(f, "noResponse"),
            Self::UnreadableResponse => write!(f, "unreadableResponse"),
            Self::Interrupted => write!(f, "interrupted"),
            Self::AdapterFailure => write!(f, "adapterFailure"),
            Self::StillProcessing => write!(f, "stillProcessing"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
