pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum TargetConfirmation {
    #[serde(rename = "published")]
    #[non_exhaustive]
    Published {
        #[serde(skip_serializing_if = "Option::is_none")]
        permalink: Option<String>,
    },

    #[serde(rename = "notPublished")]
    #[non_exhaustive]
    NotPublished {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl TargetConfirmation {
    pub fn published() -> Self {
        Self::Published { permalink: None }
    }

    pub fn not_published() -> Self {
        Self::NotPublished {}
    }

    pub fn published_with_permalink(permalink: String) -> Self {
        Self::Published {
            permalink: Some(permalink),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
