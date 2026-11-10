pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ReviewerKind {
    Member,
    ApiKey,
    Visitor,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ReviewerKind {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Member => serializer.serialize_str("member"),
            Self::ApiKey => serializer.serialize_str("apiKey"),
            Self::Visitor => serializer.serialize_str("visitor"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ReviewerKind {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "member" => Ok(Self::Member),
            "apiKey" => Ok(Self::ApiKey),
            "visitor" => Ok(Self::Visitor),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ReviewerKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Member => write!(f, "member"),
            Self::ApiKey => write!(f, "apiKey"),
            Self::Visitor => write!(f, "visitor"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
