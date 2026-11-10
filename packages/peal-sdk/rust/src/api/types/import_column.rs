pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ImportColumn {
    Text,
    Channels,
    Media,
    At,
    TimeZone,
    AllowDuplicate,
    IdempotencyKey,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ImportColumn {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Text => serializer.serialize_str("text"),
            Self::Channels => serializer.serialize_str("channels"),
            Self::Media => serializer.serialize_str("media"),
            Self::At => serializer.serialize_str("at"),
            Self::TimeZone => serializer.serialize_str("time_zone"),
            Self::AllowDuplicate => serializer.serialize_str("allow_duplicate"),
            Self::IdempotencyKey => serializer.serialize_str("idempotency_key"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ImportColumn {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "text" => Ok(Self::Text),
            "channels" => Ok(Self::Channels),
            "media" => Ok(Self::Media),
            "at" => Ok(Self::At),
            "time_zone" => Ok(Self::TimeZone),
            "allow_duplicate" => Ok(Self::AllowDuplicate),
            "idempotency_key" => Ok(Self::IdempotencyKey),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ImportColumn {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Text => write!(f, "text"),
            Self::Channels => write!(f, "channels"),
            Self::Media => write!(f, "media"),
            Self::At => write!(f, "at"),
            Self::TimeZone => write!(f, "time_zone"),
            Self::AllowDuplicate => write!(f, "allow_duplicate"),
            Self::IdempotencyKey => write!(f, "idempotency_key"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
