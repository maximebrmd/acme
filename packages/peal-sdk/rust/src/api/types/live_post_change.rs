pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct LivePostChange {
    #[serde(rename = "alreadyGone")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub already_gone: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(rename = "finishedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finished_at: Option<String>,
    #[serde(default)]
    pub id: String,
    pub kind: LivePostChangeKind,
    #[serde(rename = "partsLeft")]
    #[serde(default)]
    pub parts_left: i64,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(rename = "requestedAt")]
    #[serde(default)]
    pub requested_at: String,
    pub status: LivePostChangeStatus,
    #[serde(rename = "targetId")]
    #[serde(default)]
    pub target_id: String,
}

impl LivePostChange {
    pub fn builder() -> LivePostChangeBuilder {
        <LivePostChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LivePostChangeBuilder {
    already_gone: Option<bool>,
    code: Option<String>,
    finished_at: Option<String>,
    id: Option<String>,
    kind: Option<LivePostChangeKind>,
    parts_left: Option<i64>,
    post_id: Option<String>,
    requested_at: Option<String>,
    status: Option<LivePostChangeStatus>,
    target_id: Option<String>,
}

impl LivePostChangeBuilder {
    pub fn already_gone(mut self, value: bool) -> Self {
        self.already_gone = Some(value);
        self
    }

    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn finished_at(mut self, value: impl Into<String>) -> Self {
        self.finished_at = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn kind(mut self, value: LivePostChangeKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn parts_left(mut self, value: i64) -> Self {
        self.parts_left = Some(value);
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn requested_at(mut self, value: impl Into<String>) -> Self {
        self.requested_at = Some(value.into());
        self
    }

    pub fn status(mut self, value: LivePostChangeStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn target_id(mut self, value: impl Into<String>) -> Self {
        self.target_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`LivePostChange`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](LivePostChangeBuilder::id)
    /// - [`kind`](LivePostChangeBuilder::kind)
    /// - [`parts_left`](LivePostChangeBuilder::parts_left)
    /// - [`post_id`](LivePostChangeBuilder::post_id)
    /// - [`requested_at`](LivePostChangeBuilder::requested_at)
    /// - [`status`](LivePostChangeBuilder::status)
    /// - [`target_id`](LivePostChangeBuilder::target_id)
    pub fn build(self) -> Result<LivePostChange, BuildError> {
        Ok(LivePostChange {
            already_gone: self.already_gone,
            code: self.code,
            finished_at: self.finished_at,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
            parts_left: self
                .parts_left
                .ok_or_else(|| BuildError::missing_field("parts_left"))?,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            requested_at: self
                .requested_at
                .ok_or_else(|| BuildError::missing_field("requested_at"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            target_id: self
                .target_id
                .ok_or_else(|| BuildError::missing_field("target_id"))?,
        })
    }
}
