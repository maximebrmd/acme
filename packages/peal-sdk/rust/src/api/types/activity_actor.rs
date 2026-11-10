pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ActivityActor {
    #[serde(rename = "user")]
    #[non_exhaustive]
    User {
        #[serde(rename = "userId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        user_id: Option<String>,
    },

    #[serde(rename = "apiKey")]
    #[non_exhaustive]
    ApiKey {
        #[serde(rename = "apiKeyId")]
        #[serde(default)]
        api_key_id: String,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ActivityActor {
    pub fn user() -> Self {
        Self::User { user_id: None }
    }

    pub fn api_key(api_key_id: String) -> Self {
        Self::ApiKey { api_key_id }
    }

    pub fn user_with_user_id(user_id: String) -> Self {
        Self::User {
            user_id: Some(user_id),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
