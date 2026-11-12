pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WorkspaceOverview {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channels: Option<OverviewChannels>,
    #[serde(default)]
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inbox: Option<OverviewInbox>,
    #[serde(default)]
    pub name: String,
    #[serde(rename = "overPlan")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_plan: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub posts: Option<OverviewPosts>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refused: Option<OverviewRefusal>,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub slug: String,
}

impl WorkspaceOverview {
    pub fn builder() -> WorkspaceOverviewBuilder {
        <WorkspaceOverviewBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WorkspaceOverviewBuilder {
    channels: Option<OverviewChannels>,
    id: Option<String>,
    inbox: Option<OverviewInbox>,
    name: Option<String>,
    over_plan: Option<bool>,
    posts: Option<OverviewPosts>,
    refused: Option<OverviewRefusal>,
    role: Option<String>,
    slug: Option<String>,
}

impl WorkspaceOverviewBuilder {
    pub fn channels(mut self, value: OverviewChannels) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn inbox(mut self, value: OverviewInbox) -> Self {
        self.inbox = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn over_plan(mut self, value: bool) -> Self {
        self.over_plan = Some(value);
        self
    }

    pub fn posts(mut self, value: OverviewPosts) -> Self {
        self.posts = Some(value);
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

    /// Consumes the builder and constructs a [`WorkspaceOverview`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](WorkspaceOverviewBuilder::id)
    /// - [`name`](WorkspaceOverviewBuilder::name)
    /// - [`role`](WorkspaceOverviewBuilder::role)
    /// - [`slug`](WorkspaceOverviewBuilder::slug)
    pub fn build(self) -> Result<WorkspaceOverview, BuildError> {
        Ok(WorkspaceOverview {
            channels: self.channels,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            inbox: self.inbox,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            over_plan: self.over_plan,
            posts: self.posts,
            refused: self.refused,
            role: self.role.ok_or_else(|| BuildError::missing_field("role"))?,
            slug: self.slug.ok_or_else(|| BuildError::missing_field("slug"))?,
        })
    }
}
