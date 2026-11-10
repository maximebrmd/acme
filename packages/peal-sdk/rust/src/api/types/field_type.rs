pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum FieldType {
    Boolean,
    Choice,
    Integer,
    Text,
    TextList,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for FieldType {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Boolean => serializer.serialize_str("boolean"),
            Self::Choice => serializer.serialize_str("choice"),
            Self::Integer => serializer.serialize_str("integer"),
            Self::Text => serializer.serialize_str("text"),
            Self::TextList => serializer.serialize_str("textList"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for FieldType {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "boolean" => Ok(Self::Boolean),
            "choice" => Ok(Self::Choice),
            "integer" => Ok(Self::Integer),
            "text" => Ok(Self::Text),
            "textList" => Ok(Self::TextList),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for FieldType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Boolean => write!(f, "boolean"),
            Self::Choice => write!(f, "choice"),
            Self::Integer => write!(f, "integer"),
            Self::Text => write!(f, "text"),
            Self::TextList => write!(f, "textList"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
