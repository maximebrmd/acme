pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum YouTubeLicense {
    Youtube,
    CreativeCommon,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for YouTubeLicense {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Youtube => serializer.serialize_str("youtube"),
            Self::CreativeCommon => serializer.serialize_str("creativeCommon"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for YouTubeLicense {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "youtube" => Ok(Self::Youtube),
            "creativeCommon" => Ok(Self::CreativeCommon),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for YouTubeLicense {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Youtube => write!(f, "youtube"),
            Self::CreativeCommon => write!(f, "creativeCommon"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
