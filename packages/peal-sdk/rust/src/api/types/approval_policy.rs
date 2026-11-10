pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ApprovalPolicy {
    Never,
    ContributorsAndApplications,
    Always,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ApprovalPolicy {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Never => serializer.serialize_str("never"),
            Self::ContributorsAndApplications => {
                serializer.serialize_str("contributorsAndApplications")
            }
            Self::Always => serializer.serialize_str("always"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ApprovalPolicy {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "never" => Ok(Self::Never),
            "contributorsAndApplications" => Ok(Self::ContributorsAndApplications),
            "always" => Ok(Self::Always),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ApprovalPolicy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Never => write!(f, "never"),
            Self::ContributorsAndApplications => write!(f, "contributorsAndApplications"),
            Self::Always => write!(f, "always"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
