pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum Credential {
    #[serde(rename = "user")]
    #[non_exhaustive]
    User {
        #[serde(skip_serializing_if = "Option::is_none")]
        application: Option<CredentialApplication>,
        #[serde(rename = "userId")]
        #[serde(default)]
        user_id: String,
    },

    #[serde(rename = "apiKey")]
    #[non_exhaustive]
    ApiKey {
        #[serde(rename = "expiresAt")]
        #[serde(skip_serializing_if = "Option::is_none")]
        expires_at: Option<String>,
        #[serde(default)]
        id: String,
        #[serde(default)]
        name: String,
        #[serde(default)]
        permissions: Vec<Permission>,
        #[serde(skip_serializing_if = "Option::is_none")]
        start: Option<String>,
        #[serde(default)]
        workspace: CredentialWorkspace,
    },

    #[serde(rename = "partnerKey")]
    #[non_exhaustive]
    PartnerKey {
        #[serde(rename = "expiresAt")]
        #[serde(skip_serializing_if = "Option::is_none")]
        expires_at: Option<String>,
        #[serde(default)]
        id: String,
        #[serde(default)]
        name: String,
        #[serde(default)]
        partner: CredentialPartner,
        #[serde(default)]
        permissions: Vec<Permission>,
        #[serde(default)]
        scopes: Vec<PartnerScope>,
        #[serde(default)]
        start: String,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl Credential {
    pub fn user(user_id: String) -> Self {
        Self::User {
            application: None,
            user_id,
        }
    }

    pub fn api_key(
        id: String,
        name: String,
        permissions: Vec<Permission>,
        workspace: CredentialWorkspace,
    ) -> Self {
        Self::ApiKey {
            expires_at: None,
            id,
            name,
            permissions,
            start: None,
            workspace,
        }
    }

    pub fn partner_key(
        id: String,
        name: String,
        partner: CredentialPartner,
        permissions: Vec<Permission>,
        scopes: Vec<PartnerScope>,
        start: String,
    ) -> Self {
        Self::PartnerKey {
            expires_at: None,
            id,
            name,
            partner,
            permissions,
            scopes,
            start,
        }
    }

    pub fn user_with_application(application: CredentialApplication, user_id: String) -> Self {
        Self::User {
            application: Some(application),
            user_id,
        }
    }

    pub fn api_key_with_expires_at(
        expires_at: String,
        id: String,
        name: String,
        permissions: Vec<Permission>,
        start: Option<String>,
        workspace: CredentialWorkspace,
    ) -> Self {
        Self::ApiKey {
            expires_at: Some(expires_at),
            id,
            name,
            permissions,
            start,
            workspace,
        }
    }

    pub fn api_key_with_start(
        expires_at: Option<String>,
        id: String,
        name: String,
        permissions: Vec<Permission>,
        start: String,
        workspace: CredentialWorkspace,
    ) -> Self {
        Self::ApiKey {
            expires_at,
            id,
            name,
            permissions,
            start: Some(start),
            workspace,
        }
    }

    pub fn partner_key_with_expires_at(
        expires_at: String,
        id: String,
        name: String,
        partner: CredentialPartner,
        permissions: Vec<Permission>,
        scopes: Vec<PartnerScope>,
        start: String,
    ) -> Self {
        Self::PartnerKey {
            expires_at: Some(expires_at),
            id,
            name,
            partner,
            permissions,
            scopes,
            start,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
