pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AgendaItem {
    #[serde(default)]
    pub excerpt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platforms: Option<Vec<Platform>>,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(rename = "scheduledAt")]
    #[serde(default)]
    pub scheduled_at: String,
    pub status: PostStatus,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(rename = "workspaceId")]
    #[serde(default)]
    pub workspace_id: String,
}

impl AgendaItem {
    pub fn builder() -> AgendaItemBuilder {
        <AgendaItemBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AgendaItemBuilder {
    excerpt: Option<String>,
    platforms: Option<Vec<Platform>>,
    post_id: Option<String>,
    scheduled_at: Option<String>,
    status: Option<PostStatus>,
    time_zone: Option<String>,
    workspace_id: Option<String>,
}

impl AgendaItemBuilder {
    pub fn excerpt(mut self, value: impl Into<String>) -> Self {
        self.excerpt = Some(value.into());
        self
    }

    pub fn platforms(mut self, value: Vec<Platform>) -> Self {
        self.platforms = Some(value);
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn scheduled_at(mut self, value: impl Into<String>) -> Self {
        self.scheduled_at = Some(value.into());
        self
    }

    pub fn status(mut self, value: PostStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    pub fn workspace_id(mut self, value: impl Into<String>) -> Self {
        self.workspace_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AgendaItem`].
    /// This method will fail if any of the following fields are not set:
    /// - [`excerpt`](AgendaItemBuilder::excerpt)
    /// - [`post_id`](AgendaItemBuilder::post_id)
    /// - [`scheduled_at`](AgendaItemBuilder::scheduled_at)
    /// - [`status`](AgendaItemBuilder::status)
    /// - [`time_zone`](AgendaItemBuilder::time_zone)
    /// - [`workspace_id`](AgendaItemBuilder::workspace_id)
    pub fn build(self) -> Result<AgendaItem, BuildError> {
        Ok(AgendaItem {
            excerpt: self
                .excerpt
                .ok_or_else(|| BuildError::missing_field("excerpt"))?,
            platforms: self.platforms,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            scheduled_at: self
                .scheduled_at
                .ok_or_else(|| BuildError::missing_field("scheduled_at"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            workspace_id: self
                .workspace_id
                .ok_or_else(|| BuildError::missing_field("workspace_id"))?,
        })
    }
}
