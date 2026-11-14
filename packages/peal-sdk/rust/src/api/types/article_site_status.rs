pub use crate::prelude::*;

/// What the site makes of the article when Peal sends it.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ArticleSiteStatus {
    Publish,
    Draft,
    Future,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ArticleSiteStatus {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Publish => serializer.serialize_str("publish"),
            Self::Draft => serializer.serialize_str("draft"),
            Self::Future => serializer.serialize_str("future"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ArticleSiteStatus {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "publish" => Ok(Self::Publish),
            "draft" => Ok(Self::Draft),
            "future" => Ok(Self::Future),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ArticleSiteStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Publish => write!(f, "publish"),
            Self::Draft => write!(f, "draft"),
            Self::Future => write!(f, "future"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
