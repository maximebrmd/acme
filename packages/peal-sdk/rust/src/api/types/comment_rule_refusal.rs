pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum CommentRuleRefusal {
    Keywords,
    EmptyReply,
    NoChannel,
    Channels,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for CommentRuleRefusal {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Keywords => serializer.serialize_str("keywords"),
            Self::EmptyReply => serializer.serialize_str("emptyReply"),
            Self::NoChannel => serializer.serialize_str("noChannel"),
            Self::Channels => serializer.serialize_str("channels"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for CommentRuleRefusal {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "keywords" => Ok(Self::Keywords),
            "emptyReply" => Ok(Self::EmptyReply),
            "noChannel" => Ok(Self::NoChannel),
            "channels" => Ok(Self::Channels),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for CommentRuleRefusal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Keywords => write!(f, "keywords"),
            Self::EmptyReply => write!(f, "emptyReply"),
            Self::NoChannel => write!(f, "noChannel"),
            Self::Channels => write!(f, "channels"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
