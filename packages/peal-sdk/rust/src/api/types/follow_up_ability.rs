pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FollowUpAbility {
    Available,
    NotAsked,
    NoApi,
    Review,
    NotBuilt,
    NotAllowed,
    TurnedOff,
    Reconnect,
    NotCounted,
    TextTooLong,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FollowUpAbility {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Available => serializer.serialize_str("available"),
            Self::NotAsked => serializer.serialize_str("notAsked"),
            Self::NoApi => serializer.serialize_str("noApi"),
            Self::Review => serializer.serialize_str("review"),
            Self::NotBuilt => serializer.serialize_str("notBuilt"),
            Self::NotAllowed => serializer.serialize_str("notAllowed"),
            Self::TurnedOff => serializer.serialize_str("turnedOff"),
            Self::Reconnect => serializer.serialize_str("reconnect"),
            Self::NotCounted => serializer.serialize_str("notCounted"),
            Self::TextTooLong => serializer.serialize_str("textTooLong"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FollowUpAbility {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "available" => Ok(Self::Available),
            "notAsked" => Ok(Self::NotAsked),
            "noApi" => Ok(Self::NoApi),
            "review" => Ok(Self::Review),
            "notBuilt" => Ok(Self::NotBuilt),
            "notAllowed" => Ok(Self::NotAllowed),
            "turnedOff" => Ok(Self::TurnedOff),
            "reconnect" => Ok(Self::Reconnect),
            "notCounted" => Ok(Self::NotCounted),
            "textTooLong" => Ok(Self::TextTooLong),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FollowUpAbility {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Available => write!(f, "available"),
            Self::NotAsked => write!(f, "notAsked"),
            Self::NoApi => write!(f, "noApi"),
            Self::Review => write!(f, "review"),
            Self::NotBuilt => write!(f, "notBuilt"),
            Self::NotAllowed => write!(f, "notAllowed"),
            Self::TurnedOff => write!(f, "turnedOff"),
            Self::Reconnect => write!(f, "reconnect"),
            Self::NotCounted => write!(f, "notCounted"),
            Self::TextTooLong => write!(f, "textTooLong"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
