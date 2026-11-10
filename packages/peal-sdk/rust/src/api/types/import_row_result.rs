pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ImportRowResult {
    #[serde(rename = "created")]
    #[non_exhaustive]
    Created {
        post: Post,
        #[serde(default)]
        replayed: bool,
        #[serde(default)]
        row: i64,
    },

    #[serde(rename = "valid")]
    #[non_exhaustive]
    Valid {
        #[serde(default)]
        row: i64,
    },

    #[serde(rename = "refused")]
    #[non_exhaustive]
    Refused {
        refusal: PostRefusal,
        #[serde(default)]
        row: i64,
    },

    #[serde(rename = "unreadable")]
    #[non_exhaustive]
    Unreadable {
        #[serde(default)]
        problems: Vec<ImportCellProblem>,
        #[serde(default)]
        row: i64,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ImportRowResult {
    pub fn created(post: Post, replayed: bool, row: i64) -> Self {
        Self::Created {
            post,
            replayed,
            row,
        }
    }

    pub fn valid(row: i64) -> Self {
        Self::Valid { row }
    }

    pub fn refused(refusal: PostRefusal, row: i64) -> Self {
        Self::Refused { refusal, row }
    }

    pub fn unreadable(problems: Vec<ImportCellProblem>, row: i64) -> Self {
        Self::Unreadable { problems, row }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
