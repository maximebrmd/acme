pub use crate::prelude::*;

/// Where a boost stands: `requested`, accepted and being made, paused, spending nothing; `active`, running; `paused` by a member; `ended`, its end date passed; `stopped` by a member, for good; `failed`, it could not be made and nothing ran; `unconfirmed`, Peal told the network to run it and could not read back whether it does: it may be spending, its budget stays counted, and stopping it settles it.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum BoostState {
    Requested,
    Active,
    Paused,
    Ended,
    Stopped,
    Failed,
    Unconfirmed,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for BoostState {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Requested => serializer.serialize_str("requested"),
            Self::Active => serializer.serialize_str("active"),
            Self::Paused => serializer.serialize_str("paused"),
            Self::Ended => serializer.serialize_str("ended"),
            Self::Stopped => serializer.serialize_str("stopped"),
            Self::Failed => serializer.serialize_str("failed"),
            Self::Unconfirmed => serializer.serialize_str("unconfirmed"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for BoostState {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "requested" => Ok(Self::Requested),
            "active" => Ok(Self::Active),
            "paused" => Ok(Self::Paused),
            "ended" => Ok(Self::Ended),
            "stopped" => Ok(Self::Stopped),
            "failed" => Ok(Self::Failed),
            "unconfirmed" => Ok(Self::Unconfirmed),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for BoostState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Requested => write!(f, "requested"),
            Self::Active => write!(f, "active"),
            Self::Paused => write!(f, "paused"),
            Self::Ended => write!(f, "ended"),
            Self::Stopped => write!(f, "stopped"),
            Self::Failed => write!(f, "failed"),
            Self::Unconfirmed => write!(f, "unconfirmed"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
