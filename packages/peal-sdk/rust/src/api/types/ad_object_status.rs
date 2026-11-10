pub use crate::prelude::*;

/// Whether a campaign or an ad runs, in Peal's words, whatever its network calls it (`rawStatus` keeps the network's): `active`; `paused`, itself or by what holds it; `inReview`; `rejected` by the network; `withIssues`, until something is fixed; `archived` or `deleted`, kept for their numbers; `unknown`.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AdObjectStatus {
    Active,
    Paused,
    InReview,
    Rejected,
    WithIssues,
    Archived,
    Deleted,
    Unknown,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AdObjectStatus {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Active => serializer.serialize_str("active"),
            Self::Paused => serializer.serialize_str("paused"),
            Self::InReview => serializer.serialize_str("inReview"),
            Self::Rejected => serializer.serialize_str("rejected"),
            Self::WithIssues => serializer.serialize_str("withIssues"),
            Self::Archived => serializer.serialize_str("archived"),
            Self::Deleted => serializer.serialize_str("deleted"),
            Self::Unknown => serializer.serialize_str("unknown"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AdObjectStatus {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "active" => Ok(Self::Active),
            "paused" => Ok(Self::Paused),
            "inReview" => Ok(Self::InReview),
            "rejected" => Ok(Self::Rejected),
            "withIssues" => Ok(Self::WithIssues),
            "archived" => Ok(Self::Archived),
            "deleted" => Ok(Self::Deleted),
            "unknown" => Ok(Self::Unknown),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AdObjectStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::Paused => write!(f, "paused"),
            Self::InReview => write!(f, "inReview"),
            Self::Rejected => write!(f, "rejected"),
            Self::WithIssues => write!(f, "withIssues"),
            Self::Archived => write!(f, "archived"),
            Self::Deleted => write!(f, "deleted"),
            Self::Unknown => write!(f, "unknown"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
