pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum AnalyticsExportKind {
    Posts,
    Accounts,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for AnalyticsExportKind {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Posts => serializer.serialize_str("posts"),
            Self::Accounts => serializer.serialize_str("accounts"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for AnalyticsExportKind {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "posts" => Ok(Self::Posts),
            "accounts" => Ok(Self::Accounts),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for AnalyticsExportKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Posts => write!(f, "posts"),
            Self::Accounts => write!(f, "accounts"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
