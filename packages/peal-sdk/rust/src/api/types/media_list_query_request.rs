pub use crate::prelude::*;

/// Query parameters for list
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MediaListQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<MediaKind>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub q: Option<String>,
}

impl MediaListQueryRequest {
    pub fn builder() -> MediaListQueryRequestBuilder {
        <MediaListQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaListQueryRequestBuilder {
    cursor: Option<String>,
    kind: Option<MediaKind>,
    limit: Option<String>,
    q: Option<String>,
}

impl MediaListQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn kind(mut self, value: MediaKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn q(mut self, value: impl Into<String>) -> Self {
        self.q = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`MediaListQueryRequest`].
    pub fn build(self) -> Result<MediaListQueryRequest, BuildError> {
        Ok(MediaListQueryRequest {
            cursor: self.cursor,
            kind: self.kind,
            limit: self.limit,
            q: self.q,
        })
    }
}
