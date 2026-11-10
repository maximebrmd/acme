pub use crate::prelude::*;

/// Query parameters for find
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FindQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub q: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<ChannelStatusName>,
}

impl FindQueryRequest {
    pub fn builder() -> FindQueryRequestBuilder {
        <FindQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FindQueryRequestBuilder {
    cursor: Option<String>,
    limit: Option<String>,
    platform: Option<Platform>,
    q: Option<String>,
    status: Option<ChannelStatusName>,
}

impl FindQueryRequestBuilder {
    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn q(mut self, value: impl Into<String>) -> Self {
        self.q = Some(value.into());
        self
    }

    pub fn status(mut self, value: ChannelStatusName) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`FindQueryRequest`].
    pub fn build(self) -> Result<FindQueryRequest, BuildError> {
        Ok(FindQueryRequest {
            cursor: self.cursor,
            limit: self.limit,
            platform: self.platform,
            q: self.q,
            status: self.status,
        })
    }
}
