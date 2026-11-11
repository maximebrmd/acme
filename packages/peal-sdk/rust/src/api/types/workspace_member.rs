pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WorkspaceMember {
    #[serde(default)]
    pub email: String,
    #[serde(rename = "joinedAt")]
    #[serde(default)]
    pub joined_at: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub role: String,
    #[serde(rename = "twoStepEnabled")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub two_step_enabled: Option<bool>,
    #[serde(rename = "userId")]
    #[serde(default)]
    pub user_id: String,
}

impl WorkspaceMember {
    pub fn builder() -> WorkspaceMemberBuilder {
        <WorkspaceMemberBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WorkspaceMemberBuilder {
    email: Option<String>,
    joined_at: Option<String>,
    name: Option<String>,
    role: Option<String>,
    two_step_enabled: Option<bool>,
    user_id: Option<String>,
}

impl WorkspaceMemberBuilder {
    pub fn email(mut self, value: impl Into<String>) -> Self {
        self.email = Some(value.into());
        self
    }

    pub fn joined_at(mut self, value: impl Into<String>) -> Self {
        self.joined_at = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn role(mut self, value: impl Into<String>) -> Self {
        self.role = Some(value.into());
        self
    }

    pub fn two_step_enabled(mut self, value: bool) -> Self {
        self.two_step_enabled = Some(value);
        self
    }

    pub fn user_id(mut self, value: impl Into<String>) -> Self {
        self.user_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`WorkspaceMember`].
    /// This method will fail if any of the following fields are not set:
    /// - [`email`](WorkspaceMemberBuilder::email)
    /// - [`joined_at`](WorkspaceMemberBuilder::joined_at)
    /// - [`name`](WorkspaceMemberBuilder::name)
    /// - [`role`](WorkspaceMemberBuilder::role)
    /// - [`user_id`](WorkspaceMemberBuilder::user_id)
    pub fn build(self) -> Result<WorkspaceMember, BuildError> {
        Ok(WorkspaceMember {
            email: self
                .email
                .ok_or_else(|| BuildError::missing_field("email"))?,
            joined_at: self
                .joined_at
                .ok_or_else(|| BuildError::missing_field("joined_at"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            role: self.role.ok_or_else(|| BuildError::missing_field("role"))?,
            two_step_enabled: self.two_step_enabled,
            user_id: self
                .user_id
                .ok_or_else(|| BuildError::missing_field("user_id"))?,
        })
    }
}
