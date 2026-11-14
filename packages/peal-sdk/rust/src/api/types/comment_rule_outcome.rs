pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum CommentRuleOutcome {
    Claimed,
    Replied,
    SamePerson,
    Refused,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for CommentRuleOutcome {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Claimed => serializer.serialize_str("claimed"),
            Self::Replied => serializer.serialize_str("replied"),
            Self::SamePerson => serializer.serialize_str("samePerson"),
            Self::Refused => serializer.serialize_str("refused"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for CommentRuleOutcome {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "claimed" => Ok(Self::Claimed),
            "replied" => Ok(Self::Replied),
            "samePerson" => Ok(Self::SamePerson),
            "refused" => Ok(Self::Refused),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for CommentRuleOutcome {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Claimed => write!(f, "claimed"),
            Self::Replied => write!(f, "replied"),
            Self::SamePerson => write!(f, "samePerson"),
            Self::Refused => write!(f, "refused"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
