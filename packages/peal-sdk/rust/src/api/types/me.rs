pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct Me {
    #[serde(rename = "impersonatedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub impersonated_by: Option<String>,
    pub user: MeUser,
    #[serde(default)]
    pub workspaces: Vec<Membership>,
}

impl Me {
    pub fn builder() -> MeBuilder {
        <MeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MeBuilder {
    impersonated_by: Option<String>,
    user: Option<MeUser>,
    workspaces: Option<Vec<Membership>>,
}

impl MeBuilder {
    pub fn impersonated_by(mut self, value: impl Into<String>) -> Self {
        self.impersonated_by = Some(value.into());
        self
    }

    pub fn user(mut self, value: MeUser) -> Self {
        self.user = Some(value);
        self
    }

    pub fn workspaces(mut self, value: Vec<Membership>) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Me`].
    /// This method will fail if any of the following fields are not set:
    /// - [`user`](MeBuilder::user)
    /// - [`workspaces`](MeBuilder::workspaces)
    pub fn build(self) -> Result<Me, BuildError> {
        Ok(Me {
            impersonated_by: self.impersonated_by,
            user: self.user.ok_or_else(|| BuildError::missing_field("user"))?,
            workspaces: self
                .workspaces
                .ok_or_else(|| BuildError::missing_field("workspaces"))?,
        })
    }
}
