pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum UnprocessableEntityErrorBody {
    #[non_exhaustive]
    UnknownChannels {
        #[serde(flatten)]
        data: UnknownChannelsEncoded,
    },

    #[non_exhaustive]
    PostContentInvalid {
        #[serde(flatten)]
        data: PostContentInvalidEncoded,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl UnprocessableEntityErrorBody {
    pub fn unknown_channels(data: UnknownChannelsEncoded) -> Self {
        Self::UnknownChannels { data }
    }

    pub fn post_content_invalid(data: PostContentInvalidEncoded) -> Self {
        Self::PostContentInvalid { data }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
