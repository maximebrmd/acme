pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TextProviderKind {
    Anthropic,
    OpenaiCompatible,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for TextProviderKind {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Anthropic => serializer.serialize_str("anthropic"),
            Self::OpenaiCompatible => serializer.serialize_str("openai-compatible"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for TextProviderKind {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "anthropic" => Ok(Self::Anthropic),
            "openai-compatible" => Ok(Self::OpenaiCompatible),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for TextProviderKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Anthropic => write!(f, "anthropic"),
            Self::OpenaiCompatible => write!(f, "openai-compatible"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
