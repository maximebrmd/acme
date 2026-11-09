pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Invitation {
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub email: String,
    #[serde(rename = "expiresAt")]
    #[serde(default)]
    pub expires_at: String,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "inviterId")]
    #[serde(default)]
    pub inviter_id: String,
    #[serde(default)]
    pub role: String,
}

impl Invitation {
    pub fn builder() -> InvitationBuilder {
        <InvitationBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InvitationBuilder {
    created_at: Option<String>,
    email: Option<String>,
    expires_at: Option<String>,
    id: Option<String>,
    inviter_id: Option<String>,
    role: Option<String>,
}

impl InvitationBuilder {
    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn email(mut self, value: impl Into<String>) -> Self {
        self.email = Some(value.into());
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

    pub fn inviter_id(mut self, value: impl Into<String>) -> Self {
        self.inviter_id = Some(value.into());
        self
    }

    pub fn role(mut self, value: impl Into<String>) -> Self {
        self.role = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Invitation`].
    /// This method will fail if any of the following fields are not set:
    /// - [`created_at`](InvitationBuilder::created_at)
    /// - [`email`](InvitationBuilder::email)
    /// - [`expires_at`](InvitationBuilder::expires_at)
    /// - [`id`](InvitationBuilder::id)
    /// - [`inviter_id`](InvitationBuilder::inviter_id)
    /// - [`role`](InvitationBuilder::role)
    pub fn build(self) -> Result<Invitation, BuildError> {
        Ok(Invitation {
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            email: self
                .email
                .ok_or_else(|| BuildError::missing_field("email"))?,
            expires_at: self
                .expires_at
                .ok_or_else(|| BuildError::missing_field("expires_at"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            inviter_id: self
                .inviter_id
                .ok_or_else(|| BuildError::missing_field("inviter_id"))?,
            role: self.role.ok_or_else(|| BuildError::missing_field("role"))?,
        })
    }
}
