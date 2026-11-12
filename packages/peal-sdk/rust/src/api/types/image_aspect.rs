pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ImageAspect {
    Square,
    Landscape,
    Portrait,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ImageAspect {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Square => serializer.serialize_str("square"),
            Self::Landscape => serializer.serialize_str("landscape"),
            Self::Portrait => serializer.serialize_str("portrait"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ImageAspect {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "square" => Ok(Self::Square),
            "landscape" => Ok(Self::Landscape),
            "portrait" => Ok(Self::Portrait),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ImageAspect {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Square => write!(f, "square"),
            Self::Landscape => write!(f, "landscape"),
            Self::Portrait => write!(f, "portrait"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
