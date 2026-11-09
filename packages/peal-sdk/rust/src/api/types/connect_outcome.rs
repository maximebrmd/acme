pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ConnectOutcome {
    #[serde(rename = "connected")]
    #[non_exhaustive]
    Connected { channel: Channel },

    #[serde(rename = "choose")]
    #[non_exhaustive]
    Choose {
        #[serde(default)]
        accounts: Vec<ChoosableAccount>,
        #[serde(rename = "expiresAt")]
        #[serde(default)]
        expires_at: String,
        #[serde(default)]
        selection: String,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ConnectOutcome {
    pub fn connected(channel: Channel) -> Self {
        Self::Connected { channel }
    }

    pub fn choose(accounts: Vec<ChoosableAccount>, expires_at: String, selection: String) -> Self {
        Self::Choose {
            accounts,
            expires_at,
            selection,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
