pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct NewInvitation {
    #[serde(default)]
    pub email: String,
    pub role: Role,
}

impl NewInvitation {
    pub fn builder() -> NewInvitationBuilder {
        <NewInvitationBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewInvitationBuilder {
    email: Option<String>,
    role: Option<Role>,
}

impl NewInvitationBuilder {
    pub fn email(mut self, value: impl Into<String>) -> Self {
        self.email = Some(value.into());
        self
    }

    pub fn role(mut self, value: Role) -> Self {
        self.role = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewInvitation`].
    /// This method will fail if any of the following fields are not set:
    /// - [`email`](NewInvitationBuilder::email)
    /// - [`role`](NewInvitationBuilder::role)
    pub fn build(self) -> Result<NewInvitation, BuildError> {
        Ok(NewInvitation {
            email: self
                .email
                .ok_or_else(|| BuildError::missing_field("email"))?,
            role: self.role.ok_or_else(|| BuildError::missing_field("role"))?,
        })
    }
}
