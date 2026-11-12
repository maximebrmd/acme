pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FeedItemOutcome {
    Made,
    HeldBack,
    Skipped,
    Claimed,
    Abandoned,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FeedItemOutcome {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Made => serializer.serialize_str("made"),
            Self::HeldBack => serializer.serialize_str("heldBack"),
            Self::Skipped => serializer.serialize_str("skipped"),
            Self::Claimed => serializer.serialize_str("claimed"),
            Self::Abandoned => serializer.serialize_str("abandoned"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FeedItemOutcome {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "made" => Ok(Self::Made),
            "heldBack" => Ok(Self::HeldBack),
            "skipped" => Ok(Self::Skipped),
            "claimed" => Ok(Self::Claimed),
            "abandoned" => Ok(Self::Abandoned),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FeedItemOutcome {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Made => write!(f, "made"),
            Self::HeldBack => write!(f, "heldBack"),
            Self::Skipped => write!(f, "skipped"),
            Self::Claimed => write!(f, "claimed"),
            Self::Abandoned => write!(f, "abandoned"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
