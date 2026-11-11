pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum LivePostRefusal {
    NotPublished,
    AlreadyRemoved,
    NoPlatformId,
    NotSupported,
    ChangeInProgress,
    ChannelUnavailable,
    BoostRunning,
    ApprovalRequired,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for LivePostRefusal {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::NotPublished => serializer.serialize_str("notPublished"),
            Self::AlreadyRemoved => serializer.serialize_str("alreadyRemoved"),
            Self::NoPlatformId => serializer.serialize_str("noPlatformId"),
            Self::NotSupported => serializer.serialize_str("notSupported"),
            Self::ChangeInProgress => serializer.serialize_str("changeInProgress"),
            Self::ChannelUnavailable => serializer.serialize_str("channelUnavailable"),
            Self::BoostRunning => serializer.serialize_str("boostRunning"),
            Self::ApprovalRequired => serializer.serialize_str("approvalRequired"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for LivePostRefusal {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "notPublished" => Ok(Self::NotPublished),
            "alreadyRemoved" => Ok(Self::AlreadyRemoved),
            "noPlatformId" => Ok(Self::NoPlatformId),
            "notSupported" => Ok(Self::NotSupported),
            "changeInProgress" => Ok(Self::ChangeInProgress),
            "channelUnavailable" => Ok(Self::ChannelUnavailable),
            "boostRunning" => Ok(Self::BoostRunning),
            "approvalRequired" => Ok(Self::ApprovalRequired),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for LivePostRefusal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotPublished => write!(f, "notPublished"),
            Self::AlreadyRemoved => write!(f, "alreadyRemoved"),
            Self::NoPlatformId => write!(f, "noPlatformId"),
            Self::NotSupported => write!(f, "notSupported"),
            Self::ChangeInProgress => write!(f, "changeInProgress"),
            Self::ChannelUnavailable => write!(f, "channelUnavailable"),
            Self::BoostRunning => write!(f, "boostRunning"),
            Self::ApprovalRequired => write!(f, "approvalRequired"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
