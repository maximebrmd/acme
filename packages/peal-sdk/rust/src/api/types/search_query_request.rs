pub use crate::prelude::*;

/// Query parameters for search
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SearchQueryRequest {
    #[serde(rename = "authorId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_id: Option<String>,
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(rename = "createdVia")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_via: Option<PostOriginVia>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<PostOutcome>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
    #[serde(rename = "queueId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queue_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub removed: Option<SearchPostsRequestRemoved>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort: Option<PostSort>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<PostStatus>,
    #[serde(rename = "tagId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<String>,
}

impl SearchQueryRequest {
    pub fn builder() -> SearchQueryRequestBuilder {
        <SearchQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SearchQueryRequestBuilder {
    author_id: Option<String>,
    channel_id: Option<String>,
    created_via: Option<PostOriginVia>,
    cursor: Option<String>,
    from: Option<String>,
    limit: Option<String>,
    outcome: Option<PostOutcome>,
    platform: Option<Platform>,
    queue_id: Option<String>,
    removed: Option<SearchPostsRequestRemoved>,
    sort: Option<PostSort>,
    status: Option<PostStatus>,
    tag_id: Option<String>,
    to: Option<String>,
}

impl SearchQueryRequestBuilder {
    pub fn author_id(mut self, value: impl Into<String>) -> Self {
        self.author_id = Some(value.into());
        self
    }

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn created_via(mut self, value: PostOriginVia) -> Self {
        self.created_via = Some(value);
        self
    }

    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn from(mut self, value: impl Into<String>) -> Self {
        self.from = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn outcome(mut self, value: PostOutcome) -> Self {
        self.outcome = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn queue_id(mut self, value: impl Into<String>) -> Self {
        self.queue_id = Some(value.into());
        self
    }

    pub fn removed(mut self, value: SearchPostsRequestRemoved) -> Self {
        self.removed = Some(value);
        self
    }

    pub fn sort(mut self, value: PostSort) -> Self {
        self.sort = Some(value);
        self
    }

    pub fn status(mut self, value: PostStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn tag_id(mut self, value: impl Into<String>) -> Self {
        self.tag_id = Some(value.into());
        self
    }

    pub fn to(mut self, value: impl Into<String>) -> Self {
        self.to = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`SearchQueryRequest`].
    pub fn build(self) -> Result<SearchQueryRequest, BuildError> {
        Ok(SearchQueryRequest {
            author_id: self.author_id,
            channel_id: self.channel_id,
            created_via: self.created_via,
            cursor: self.cursor,
            from: self.from,
            limit: self.limit,
            outcome: self.outcome,
            platform: self.platform,
            queue_id: self.queue_id,
            removed: self.removed,
            sort: self.sort,
            status: self.status,
            tag_id: self.tag_id,
            to: self.to,
        })
    }
}
