pub use crate::prelude::*;

/// How a platform measures the length of a post's text.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TextUnit {
    Graphemes,
    CodePoints,
    Utf8Bytes,
    EmojiBytes,
    Utf16Units,
    Weighted,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for TextUnit {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Graphemes => serializer.serialize_str("graphemes"),
            Self::CodePoints => serializer.serialize_str("codePoints"),
            Self::Utf8Bytes => serializer.serialize_str("utf8Bytes"),
            Self::EmojiBytes => serializer.serialize_str("emojiBytes"),
            Self::Utf16Units => serializer.serialize_str("utf16Units"),
            Self::Weighted => serializer.serialize_str("weighted"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for TextUnit {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "graphemes" => Ok(Self::Graphemes),
            "codePoints" => Ok(Self::CodePoints),
            "utf8Bytes" => Ok(Self::Utf8Bytes),
            "emojiBytes" => Ok(Self::EmojiBytes),
            "utf16Units" => Ok(Self::Utf16Units),
            "weighted" => Ok(Self::Weighted),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for TextUnit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Graphemes => write!(f, "graphemes"),
            Self::CodePoints => write!(f, "codePoints"),
            Self::Utf8Bytes => write!(f, "utf8Bytes"),
            Self::EmojiBytes => write!(f, "emojiBytes"),
            Self::Utf16Units => write!(f, "utf16Units"),
            Self::Weighted => write!(f, "weighted"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
