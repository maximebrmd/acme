pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ArticleViolationTooManyTermsField {
    Categories,
    Tags,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ArticleViolationTooManyTermsField {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Categories => serializer.serialize_str("categories"),
            Self::Tags => serializer.serialize_str("tags"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ArticleViolationTooManyTermsField {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "categories" => Ok(Self::Categories),
            "tags" => Ok(Self::Tags),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ArticleViolationTooManyTermsField {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Categories => write!(f, "categories"),
            Self::Tags => write!(f, "tags"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
