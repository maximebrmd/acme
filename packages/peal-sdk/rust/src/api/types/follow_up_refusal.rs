pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FollowUpRefusal {
    NoAction,
    EmptyComment,
    PostCancelled,
    NoChannel,
    AlreadyFollowedUp,
    Channels,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FollowUpRefusal {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::NoAction => serializer.serialize_str("noAction"),
            Self::EmptyComment => serializer.serialize_str("emptyComment"),
            Self::PostCancelled => serializer.serialize_str("postCancelled"),
            Self::NoChannel => serializer.serialize_str("noChannel"),
            Self::AlreadyFollowedUp => serializer.serialize_str("alreadyFollowedUp"),
            Self::Channels => serializer.serialize_str("channels"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FollowUpRefusal {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "noAction" => Ok(Self::NoAction),
            "emptyComment" => Ok(Self::EmptyComment),
            "postCancelled" => Ok(Self::PostCancelled),
            "noChannel" => Ok(Self::NoChannel),
            "alreadyFollowedUp" => Ok(Self::AlreadyFollowedUp),
            "channels" => Ok(Self::Channels),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FollowUpRefusal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NoAction => write!(f, "noAction"),
            Self::EmptyComment => write!(f, "emptyComment"),
            Self::PostCancelled => write!(f, "postCancelled"),
            Self::NoChannel => write!(f, "noChannel"),
            Self::AlreadyFollowedUp => write!(f, "alreadyFollowedUp"),
            Self::Channels => write!(f, "channels"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
