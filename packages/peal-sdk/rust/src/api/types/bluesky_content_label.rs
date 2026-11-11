pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum BlueskyContentLabel {
    Sexual,
    Nudity,
    Porn,
    GraphicMedia,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for BlueskyContentLabel {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Sexual => serializer.serialize_str("sexual"),
            Self::Nudity => serializer.serialize_str("nudity"),
            Self::Porn => serializer.serialize_str("porn"),
            Self::GraphicMedia => serializer.serialize_str("graphic-media"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for BlueskyContentLabel {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "sexual" => Ok(Self::Sexual),
            "nudity" => Ok(Self::Nudity),
            "porn" => Ok(Self::Porn),
            "graphic-media" => Ok(Self::GraphicMedia),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for BlueskyContentLabel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Sexual => write!(f, "sexual"),
            Self::Nudity => write!(f, "nudity"),
            Self::Porn => write!(f, "porn"),
            Self::GraphicMedia => write!(f, "graphic-media"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
