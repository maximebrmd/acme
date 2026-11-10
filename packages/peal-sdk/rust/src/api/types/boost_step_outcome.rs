pub use crate::prelude::*;

/// How a request to the ad network ended: `done`, confirmed; `refused`, the network answered that nothing changed; `found` or `absent`, its answer was lost and looking the object up found it done, or not; `unknown`, the look-up could not tell.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum BoostStepOutcome {
    Done,
    Refused,
    Found,
    Absent,
    Unknown,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for BoostStepOutcome {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Done => serializer.serialize_str("done"),
            Self::Refused => serializer.serialize_str("refused"),
            Self::Found => serializer.serialize_str("found"),
            Self::Absent => serializer.serialize_str("absent"),
            Self::Unknown => serializer.serialize_str("unknown"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for BoostStepOutcome {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "done" => Ok(Self::Done),
            "refused" => Ok(Self::Refused),
            "found" => Ok(Self::Found),
            "absent" => Ok(Self::Absent),
            "unknown" => Ok(Self::Unknown),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for BoostStepOutcome {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Done => write!(f, "done"),
            Self::Refused => write!(f, "refused"),
            Self::Found => write!(f, "found"),
            Self::Absent => write!(f, "absent"),
            Self::Unknown => write!(f, "unknown"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
