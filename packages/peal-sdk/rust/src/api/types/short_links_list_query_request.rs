pub use crate::prelude::*;

/// Query parameters for list
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ShortLinksListQueryRequest {
    #[serde(rename = "channelId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
}

impl ShortLinksListQueryRequest {
    pub fn builder() -> ShortLinksListQueryRequestBuilder {
        <ShortLinksListQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ShortLinksListQueryRequestBuilder {
    channel_id: Option<String>,
    cursor: Option<String>,
    from: Option<CalendarDay>,
    limit: Option<String>,
    post_id: Option<String>,
    to: Option<CalendarDay>,
}

impl ShortLinksListQueryRequestBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ShortLinksListQueryRequest`].
    pub fn build(self) -> Result<ShortLinksListQueryRequest, BuildError> {
        Ok(ShortLinksListQueryRequest {
            channel_id: self.channel_id,
            cursor: self.cursor,
            from: self.from,
            limit: self.limit,
            post_id: self.post_id,
            to: self.to,
        })
    }
}
