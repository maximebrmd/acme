pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum Suggestion {
    #[serde(rename = "text")]
    #[non_exhaustive]
    Text {
        #[serde(default)]
        text: String,
    },

    #[serde(rename = "hashtags")]
    #[non_exhaustive]
    Hashtags {
        #[serde(default)]
        hashtags: Vec<String>,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl Suggestion {
    pub fn text(text: String) -> Self {
        Self::Text { text }
    }

    pub fn hashtags(hashtags: Vec<String>) -> Self {
        Self::Hashtags { hashtags }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
