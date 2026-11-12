pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum RecyclingNoticeReason {
    SourceGone,
    StarterGone,
    NoChannels,
    ContentRejected,
    PlanLimit,
    QueueGone,
    QueueFull,
    SourceWithdrawn,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for RecyclingNoticeReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::SourceGone => serializer.serialize_str("sourceGone"),
            Self::StarterGone => serializer.serialize_str("starterGone"),
            Self::NoChannels => serializer.serialize_str("noChannels"),
            Self::ContentRejected => serializer.serialize_str("contentRejected"),
            Self::PlanLimit => serializer.serialize_str("planLimit"),
            Self::QueueGone => serializer.serialize_str("queueGone"),
            Self::QueueFull => serializer.serialize_str("queueFull"),
            Self::SourceWithdrawn => serializer.serialize_str("sourceWithdrawn"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for RecyclingNoticeReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "sourceGone" => Ok(Self::SourceGone),
            "starterGone" => Ok(Self::StarterGone),
            "noChannels" => Ok(Self::NoChannels),
            "contentRejected" => Ok(Self::ContentRejected),
            "planLimit" => Ok(Self::PlanLimit),
            "queueGone" => Ok(Self::QueueGone),
            "queueFull" => Ok(Self::QueueFull),
            "sourceWithdrawn" => Ok(Self::SourceWithdrawn),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for RecyclingNoticeReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SourceGone => write!(f, "sourceGone"),
            Self::StarterGone => write!(f, "starterGone"),
            Self::NoChannels => write!(f, "noChannels"),
            Self::ContentRejected => write!(f, "contentRejected"),
            Self::PlanLimit => write!(f, "planLimit"),
            Self::QueueGone => write!(f, "queueGone"),
            Self::QueueFull => write!(f, "queueFull"),
            Self::SourceWithdrawn => write!(f, "sourceWithdrawn"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
