pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ReviewLink {
    pub access: ReviewLinkAccess,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(rename = "createdBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_by: Option<String>,
    #[serde(rename = "expiresAt")]
    #[serde(default)]
    pub expires_at: String,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(rename = "revokedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revoked_at: Option<String>,
    pub status: ReviewLinkStatus,
}

impl ReviewLink {
    pub fn builder() -> ReviewLinkBuilder {
        <ReviewLinkBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReviewLinkBuilder {
    access: Option<ReviewLinkAccess>,
    created_at: Option<String>,
    created_by: Option<String>,
    expires_at: Option<String>,
    id: Option<String>,
    post_id: Option<String>,
    revoked_at: Option<String>,
    status: Option<ReviewLinkStatus>,
}

impl ReviewLinkBuilder {
    pub fn access(mut self, value: ReviewLinkAccess) -> Self {
        self.access = Some(value);
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn created_by(mut self, value: impl Into<String>) -> Self {
        self.created_by = Some(value.into());
        self
    }

    pub fn expires_at(mut self, value: impl Into<String>) -> Self {
        self.expires_at = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn revoked_at(mut self, value: impl Into<String>) -> Self {
        self.revoked_at = Some(value.into());
        self
    }

    pub fn status(mut self, value: ReviewLinkStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ReviewLink`].
    /// This method will fail if any of the following fields are not set:
    /// - [`access`](ReviewLinkBuilder::access)
    /// - [`created_at`](ReviewLinkBuilder::created_at)
    /// - [`expires_at`](ReviewLinkBuilder::expires_at)
    /// - [`id`](ReviewLinkBuilder::id)
    /// - [`post_id`](ReviewLinkBuilder::post_id)
    /// - [`status`](ReviewLinkBuilder::status)
    pub fn build(self) -> Result<ReviewLink, BuildError> {
        Ok(ReviewLink {
            access: self
                .access
                .ok_or_else(|| BuildError::missing_field("access"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            created_by: self.created_by,
            expires_at: self
                .expires_at
                .ok_or_else(|| BuildError::missing_field("expires_at"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            revoked_at: self.revoked_at,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
