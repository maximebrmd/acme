pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum CredentialBinding {
    #[serde(rename = "unbound")]
    #[non_exhaustive]
    Unbound {},

    #[serde(rename = "bound")]
    #[non_exhaustive]
    Bound {
        #[serde(default)]
        id: String,
        #[serde(default)]
        name: String,
        #[serde(default)]
        permissions: Vec<Permission>,
        #[serde(skip_serializing_if = "Option::is_none")]
        refused: Option<OverviewRefusal>,
    },

    #[serde(rename = "left")]
    #[non_exhaustive]
    Left {
        #[serde(default)]
        id: String,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl CredentialBinding {
    pub fn unbound() -> Self {
        Self::Unbound {}
    }

    pub fn bound(id: String, name: String, permissions: Vec<Permission>) -> Self {
        Self::Bound {
            id,
            name,
            permissions,
            refused: None,
        }
    }

    pub fn left(id: String) -> Self {
        Self::Left { id }
    }

    pub fn bound_with_refused(
        id: String,
        name: String,
        permissions: Vec<Permission>,
        refused: OverviewRefusal,
    ) -> Self {
        Self::Bound {
            id,
            name,
            permissions,
            refused: Some(refused),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
