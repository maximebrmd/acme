pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum BulkPostResult {
    #[serde(rename = "created")]
    #[non_exhaustive]
    Created {
        #[serde(default)]
        index: i64,
        post: Post,
        #[serde(default)]
        replayed: bool,
    },

    #[serde(rename = "refused")]
    #[non_exhaustive]
    Refused {
        #[serde(default)]
        index: i64,
        refusal: PostRefusal,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl BulkPostResult {
    pub fn created(index: i64, post: Post, replayed: bool) -> Self {
        Self::Created {
            index,
            post,
            replayed,
        }
    }

    pub fn refused(index: i64, refusal: PostRefusal) -> Self {
        Self::Refused { index, refusal }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
