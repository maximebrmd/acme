pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum AssistantAction {
    #[serde(rename = "rewrite")]
    #[non_exhaustive]
    Rewrite { tone: AssistantTone },

    #[serde(rename = "shorten")]
    #[non_exhaustive]
    Shorten { platform: Platform },

    #[serde(rename = "translate")]
    #[non_exhaustive]
    Translate { language: TranslationLanguage },

    #[serde(rename = "hashtags")]
    #[non_exhaustive]
    Hashtags {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl AssistantAction {
    pub fn rewrite(tone: AssistantTone) -> Self {
        Self::Rewrite { tone }
    }

    pub fn shorten(platform: Platform) -> Self {
        Self::Shorten { platform }
    }

    pub fn translate(language: TranslationLanguage) -> Self {
        Self::Translate { language }
    }

    pub fn hashtags() -> Self {
        Self::Hashtags {}
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
