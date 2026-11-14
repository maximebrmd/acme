pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Partner {
    #[serde(rename = "accentColor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accent_color: Option<String>,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "logoUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_url: Option<String>,
    #[serde(default)]
    pub name: String,
    #[serde(rename = "returnOrigins")]
    #[serde(default)]
    pub return_origins: Vec<String>,
    #[serde(rename = "workspaceId")]
    #[serde(default)]
    pub workspace_id: String,
}

impl Partner {
    pub fn builder() -> PartnerBuilder {
        <PartnerBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerBuilder {
    accent_color: Option<String>,
    created_at: Option<String>,
    id: Option<String>,
    logo_url: Option<String>,
    name: Option<String>,
    return_origins: Option<Vec<String>>,
    workspace_id: Option<String>,
}

impl PartnerBuilder {
    pub fn accent_color(mut self, value: impl Into<String>) -> Self {
        self.accent_color = Some(value.into());
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn logo_url(mut self, value: impl Into<String>) -> Self {
        self.logo_url = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn return_origins(mut self, value: Vec<String>) -> Self {
        self.return_origins = Some(value);
        self
    }

    pub fn workspace_id(mut self, value: impl Into<String>) -> Self {
        self.workspace_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Partner`].
    /// This method will fail if any of the following fields are not set:
    /// - [`created_at`](PartnerBuilder::created_at)
    /// - [`id`](PartnerBuilder::id)
    /// - [`name`](PartnerBuilder::name)
    /// - [`return_origins`](PartnerBuilder::return_origins)
    /// - [`workspace_id`](PartnerBuilder::workspace_id)
    pub fn build(self) -> Result<Partner, BuildError> {
        Ok(Partner {
            accent_color: self.accent_color,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            logo_url: self.logo_url,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            return_origins: self
                .return_origins
                .ok_or_else(|| BuildError::missing_field("return_origins"))?,
            workspace_id: self
                .workspace_id
                .ok_or_else(|| BuildError::missing_field("workspace_id"))?,
        })
    }
}
