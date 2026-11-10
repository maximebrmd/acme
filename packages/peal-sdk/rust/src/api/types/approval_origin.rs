pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ApprovalOrigin {
    Member,
    ApiKey,
    Application,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ApprovalOrigin {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Member => serializer.serialize_str("member"),
            Self::ApiKey => serializer.serialize_str("apiKey"),
            Self::Application => serializer.serialize_str("application"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ApprovalOrigin {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "member" => Ok(Self::Member),
            "apiKey" => Ok(Self::ApiKey),
            "application" => Ok(Self::Application),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ApprovalOrigin {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Member => write!(f, "member"),
            Self::ApiKey => write!(f, "apiKey"),
            Self::Application => write!(f, "application"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
