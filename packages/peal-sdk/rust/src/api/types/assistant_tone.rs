pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AssistantTone {
    Professional,
    Friendly,
    Casual,
    Enthusiastic,
    Witty,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AssistantTone {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Professional => serializer.serialize_str("professional"),
            Self::Friendly => serializer.serialize_str("friendly"),
            Self::Casual => serializer.serialize_str("casual"),
            Self::Enthusiastic => serializer.serialize_str("enthusiastic"),
            Self::Witty => serializer.serialize_str("witty"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AssistantTone {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "professional" => Ok(Self::Professional),
            "friendly" => Ok(Self::Friendly),
            "casual" => Ok(Self::Casual),
            "enthusiastic" => Ok(Self::Enthusiastic),
            "witty" => Ok(Self::Witty),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AssistantTone {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Professional => write!(f, "professional"),
            Self::Friendly => write!(f, "friendly"),
            Self::Casual => write!(f, "casual"),
            Self::Enthusiastic => write!(f, "enthusiastic"),
            Self::Witty => write!(f, "witty"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
