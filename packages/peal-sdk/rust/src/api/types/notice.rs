pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Notice {
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    pub event: NoticeEvent,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "readAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub read_at: Option<String>,
    #[serde(rename = "workspaceId")]
    #[serde(default)]
    pub workspace_id: String,
}

impl Notice {
    pub fn builder() -> NoticeBuilder {
        <NoticeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NoticeBuilder {
    created_at: Option<String>,
    event: Option<NoticeEvent>,
    id: Option<String>,
    read_at: Option<String>,
    workspace_id: Option<String>,
}

impl NoticeBuilder {
    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn event(mut self, value: NoticeEvent) -> Self {
        self.event = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn read_at(mut self, value: impl Into<String>) -> Self {
        self.read_at = Some(value.into());
        self
    }

    pub fn workspace_id(mut self, value: impl Into<String>) -> Self {
        self.workspace_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Notice`].
    /// This method will fail if any of the following fields are not set:
    /// - [`created_at`](NoticeBuilder::created_at)
    /// - [`event`](NoticeBuilder::event)
    /// - [`id`](NoticeBuilder::id)
    /// - [`workspace_id`](NoticeBuilder::workspace_id)
    pub fn build(self) -> Result<Notice, BuildError> {
        Ok(Notice {
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            event: self
                .event
                .ok_or_else(|| BuildError::missing_field("event"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            read_at: self.read_at,
            workspace_id: self
                .workspace_id
                .ok_or_else(|| BuildError::missing_field("workspace_id"))?,
        })
    }
}
