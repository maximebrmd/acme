pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Post {
    #[serde(rename = "authorId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_id: Option<String>,
    #[serde(default)]
    pub content: PostContent,
    #[serde(rename = "createdVia")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_via: Option<PostOrigin>,
    #[serde(default)]
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub occurrence: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<PostOutcome>,
    #[serde(rename = "queueId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queue_id: Option<String>,
    #[serde(rename = "recyclingId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recycling_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule: Option<PostSchedule>,
    #[serde(rename = "scheduledBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheduled_by: Option<String>,
    #[serde(rename = "scheduledVia")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheduled_via: Option<PostOrigin>,
    #[serde(rename = "shortenLinks")]
    #[serde(default)]
    pub shorten_links: bool,
    pub status: PostStatus,
    #[serde(rename = "tagIds")]
    #[serde(default)]
    pub tag_ids: Vec<String>,
    #[serde(default)]
    pub targets: Vec<PostTarget>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warnings: Option<Vec<PostWarning>>,
}

impl Post {
    pub fn builder() -> PostBuilder {
        <PostBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostBuilder {
    author_id: Option<String>,
    content: Option<PostContent>,
    created_via: Option<PostOrigin>,
    id: Option<String>,
    occurrence: Option<i64>,
    outcome: Option<PostOutcome>,
    queue_id: Option<String>,
    recycling_id: Option<String>,
    schedule: Option<PostSchedule>,
    scheduled_by: Option<String>,
    scheduled_via: Option<PostOrigin>,
    shorten_links: Option<bool>,
    status: Option<PostStatus>,
    tag_ids: Option<Vec<String>>,
    targets: Option<Vec<PostTarget>>,
    warnings: Option<Vec<PostWarning>>,
}

impl PostBuilder {
    pub fn author_id(mut self, value: impl Into<String>) -> Self {
        self.author_id = Some(value.into());
        self
    }

    pub fn content(mut self, value: PostContent) -> Self {
        self.content = Some(value);
        self
    }

    pub fn created_via(mut self, value: PostOrigin) -> Self {
        self.created_via = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn occurrence(mut self, value: i64) -> Self {
        self.occurrence = Some(value);
        self
    }

    pub fn outcome(mut self, value: PostOutcome) -> Self {
        self.outcome = Some(value);
        self
    }

    pub fn queue_id(mut self, value: impl Into<String>) -> Self {
        self.queue_id = Some(value.into());
        self
    }

    pub fn recycling_id(mut self, value: impl Into<String>) -> Self {
        self.recycling_id = Some(value.into());
        self
    }

    pub fn schedule(mut self, value: PostSchedule) -> Self {
        self.schedule = Some(value);
        self
    }

    pub fn scheduled_by(mut self, value: impl Into<String>) -> Self {
        self.scheduled_by = Some(value.into());
        self
    }

    pub fn scheduled_via(mut self, value: PostOrigin) -> Self {
        self.scheduled_via = Some(value);
        self
    }

    pub fn shorten_links(mut self, value: bool) -> Self {
        self.shorten_links = Some(value);
        self
    }

    pub fn status(mut self, value: PostStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn tag_ids(mut self, value: Vec<String>) -> Self {
        self.tag_ids = Some(value);
        self
    }

    pub fn targets(mut self, value: Vec<PostTarget>) -> Self {
        self.targets = Some(value);
        self
    }

    pub fn warnings(mut self, value: Vec<PostWarning>) -> Self {
        self.warnings = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Post`].
    /// This method will fail if any of the following fields are not set:
    /// - [`content`](PostBuilder::content)
    /// - [`id`](PostBuilder::id)
    /// - [`shorten_links`](PostBuilder::shorten_links)
    /// - [`status`](PostBuilder::status)
    /// - [`tag_ids`](PostBuilder::tag_ids)
    /// - [`targets`](PostBuilder::targets)
    pub fn build(self) -> Result<Post, BuildError> {
        Ok(Post {
            author_id: self.author_id,
            content: self
                .content
                .ok_or_else(|| BuildError::missing_field("content"))?,
            created_via: self.created_via,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            occurrence: self.occurrence,
            outcome: self.outcome,
            queue_id: self.queue_id,
            recycling_id: self.recycling_id,
            schedule: self.schedule,
            scheduled_by: self.scheduled_by,
            scheduled_via: self.scheduled_via,
            shorten_links: self
                .shorten_links
                .ok_or_else(|| BuildError::missing_field("shorten_links"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            tag_ids: self
                .tag_ids
                .ok_or_else(|| BuildError::missing_field("tag_ids"))?,
            targets: self
                .targets
                .ok_or_else(|| BuildError::missing_field("targets"))?,
            warnings: self.warnings,
        })
    }
}
