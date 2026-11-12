pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FacebookFormat {
    Feed,
    Story,
    Reel,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FacebookFormat {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Feed => serializer.serialize_str("feed"),
            Self::Story => serializer.serialize_str("story"),
            Self::Reel => serializer.serialize_str("reel"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FacebookFormat {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "feed" => Ok(Self::Feed),
            "story" => Ok(Self::Story),
            "reel" => Ok(Self::Reel),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FacebookFormat {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Feed => write!(f, "feed"),
            Self::Story => write!(f, "story"),
            Self::Reel => write!(f, "reel"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
