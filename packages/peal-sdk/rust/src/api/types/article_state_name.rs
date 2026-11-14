pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ArticleStateName {
    Draft,
    Scheduled,
    Publishing,
    Published,
    Failed,
    Unconfirmed,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ArticleStateName {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Draft => serializer.serialize_str("draft"),
            Self::Scheduled => serializer.serialize_str("scheduled"),
            Self::Publishing => serializer.serialize_str("publishing"),
            Self::Published => serializer.serialize_str("published"),
            Self::Failed => serializer.serialize_str("failed"),
            Self::Unconfirmed => serializer.serialize_str("unconfirmed"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ArticleStateName {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "draft" => Ok(Self::Draft),
            "scheduled" => Ok(Self::Scheduled),
            "publishing" => Ok(Self::Publishing),
            "published" => Ok(Self::Published),
            "failed" => Ok(Self::Failed),
            "unconfirmed" => Ok(Self::Unconfirmed),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ArticleStateName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Draft => write!(f, "draft"),
            Self::Scheduled => write!(f, "scheduled"),
            Self::Publishing => write!(f, "publishing"),
            Self::Published => write!(f, "published"),
            Self::Failed => write!(f, "failed"),
            Self::Unconfirmed => write!(f, "unconfirmed"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
