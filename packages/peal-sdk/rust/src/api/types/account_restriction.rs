pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum AccountRestriction {
    #[serde(rename = "optionValues")]
    #[non_exhaustive]
    OptionValues {
        #[serde(default)]
        field: String,
        #[serde(default)]
        values: Vec<String>,
    },

    #[serde(rename = "optionFixed")]
    #[non_exhaustive]
    OptionFixed {
        #[serde(default)]
        field: String,
        #[serde(default)]
        value: bool,
    },

    #[serde(rename = "videoDuration")]
    #[non_exhaustive]
    VideoDuration {
        #[serde(rename = "maximumMs")]
        #[serde(default)]
        maximum_ms: i64,
    },

    #[serde(rename = "mediaTypesRefused")]
    #[non_exhaustive]
    MediaTypesRefused {
        #[serde(rename = "contentTypes")]
        #[serde(default)]
        content_types: Vec<MediaContentType>,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl AccountRestriction {
    pub fn option_values(field: String, values: Vec<String>) -> Self {
        Self::OptionValues { field, values }
    }

    pub fn option_fixed(field: String, value: bool) -> Self {
        Self::OptionFixed { field, value }
    }

    pub fn video_duration(maximum_ms: i64) -> Self {
        Self::VideoDuration { maximum_ms }
    }

    pub fn media_types_refused(content_types: Vec<MediaContentType>) -> Self {
        Self::MediaTypesRefused { content_types }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
