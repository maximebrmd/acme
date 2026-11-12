pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FeedItemReason {
    Existing,
    TooMany,
    Empty,
    ContentRejected,
    PlanLimit,
    QueueFull,
    NoChannels,
    Duplicate,
    QueueGone,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FeedItemReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Existing => serializer.serialize_str("existing"),
            Self::TooMany => serializer.serialize_str("tooMany"),
            Self::Empty => serializer.serialize_str("empty"),
            Self::ContentRejected => serializer.serialize_str("contentRejected"),
            Self::PlanLimit => serializer.serialize_str("planLimit"),
            Self::QueueFull => serializer.serialize_str("queueFull"),
            Self::NoChannels => serializer.serialize_str("noChannels"),
            Self::Duplicate => serializer.serialize_str("duplicate"),
            Self::QueueGone => serializer.serialize_str("queueGone"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FeedItemReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "existing" => Ok(Self::Existing),
            "tooMany" => Ok(Self::TooMany),
            "empty" => Ok(Self::Empty),
            "contentRejected" => Ok(Self::ContentRejected),
            "planLimit" => Ok(Self::PlanLimit),
            "queueFull" => Ok(Self::QueueFull),
            "noChannels" => Ok(Self::NoChannels),
            "duplicate" => Ok(Self::Duplicate),
            "queueGone" => Ok(Self::QueueGone),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FeedItemReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Existing => write!(f, "existing"),
            Self::TooMany => write!(f, "tooMany"),
            Self::Empty => write!(f, "empty"),
            Self::ContentRejected => write!(f, "contentRejected"),
            Self::PlanLimit => write!(f, "planLimit"),
            Self::QueueFull => write!(f, "queueFull"),
            Self::NoChannels => write!(f, "noChannels"),
            Self::Duplicate => write!(f, "duplicate"),
            Self::QueueGone => write!(f, "queueGone"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
