pub use crate::prelude::*;

/// Whether Peal's reads of the ad network work: `reconnectNeeded` once the network refused the sign-in's token, until its person signs in again.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AdAccess {
    Working,
    ReconnectNeeded,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AdAccess {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Working => serializer.serialize_str("working"),
            Self::ReconnectNeeded => serializer.serialize_str("reconnectNeeded"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AdAccess {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "working" => Ok(Self::Working),
            "reconnectNeeded" => Ok(Self::ReconnectNeeded),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AdAccess {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Working => write!(f, "working"),
            Self::ReconnectNeeded => write!(f, "reconnectNeeded"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
