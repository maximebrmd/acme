pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum AccountStanding {
    #[serde(rename = "unrestricted")]
    #[non_exhaustive]
    Unrestricted {},

    #[serde(rename = "read")]
    #[non_exhaustive]
    Read {
        #[serde(skip_serializing_if = "Option::is_none")]
        blocked: Option<TikTokBlock>,
        #[serde(default)]
        restrictions: Vec<AccountRestriction>,
    },

    #[serde(rename = "unread")]
    #[non_exhaustive]
    Unread { reason: AccountUnreadReason },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl AccountStanding {
    pub fn unrestricted() -> Self {
        Self::Unrestricted {}
    }

    pub fn read(restrictions: Vec<AccountRestriction>) -> Self {
        Self::Read {
            blocked: None,
            restrictions,
        }
    }

    pub fn unread(reason: AccountUnreadReason) -> Self {
        Self::Unread { reason }
    }

    pub fn read_with_blocked(blocked: TikTokBlock, restrictions: Vec<AccountRestriction>) -> Self {
        Self::Read {
            blocked: Some(blocked),
            restrictions,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
