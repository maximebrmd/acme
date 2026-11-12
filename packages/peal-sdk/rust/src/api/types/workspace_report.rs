pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WorkspaceReport {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub analytics: Option<WorkspaceAnalytics>,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refused: Option<OverviewRefusal>,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub slug: String,
}

impl WorkspaceReport {
    pub fn builder() -> WorkspaceReportBuilder {
        <WorkspaceReportBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WorkspaceReportBuilder {
    analytics: Option<WorkspaceAnalytics>,
    id: Option<String>,
    name: Option<String>,
    refused: Option<OverviewRefusal>,
    role: Option<String>,
    slug: Option<String>,
}

impl WorkspaceReportBuilder {
    pub fn analytics(mut self, value: WorkspaceAnalytics) -> Self {
        self.analytics = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn refused(mut self, value: OverviewRefusal) -> Self {
        self.refused = Some(value);
        self
    }

    pub fn role(mut self, value: impl Into<String>) -> Self {
        self.role = Some(value.into());
        self
    }

    pub fn slug(mut self, value: impl Into<String>) -> Self {
        self.slug = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`WorkspaceReport`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](WorkspaceReportBuilder::id)
    /// - [`name`](WorkspaceReportBuilder::name)
    /// - [`role`](WorkspaceReportBuilder::role)
    /// - [`slug`](WorkspaceReportBuilder::slug)
    pub fn build(self) -> Result<WorkspaceReport, BuildError> {
        Ok(WorkspaceReport {
            analytics: self.analytics,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            refused: self.refused,
            role: self.role.ok_or_else(|| BuildError::missing_field("role"))?,
            slug: self.slug.ok_or_else(|| BuildError::missing_field("slug"))?,
        })
    }
}
