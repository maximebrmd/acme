pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct LivePart {
    #[serde(default)]
    pub index: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permalink: Option<String>,
    #[serde(rename = "platformPostId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform_post_id: Option<String>,
    #[serde(rename = "publishedAt")]
    #[serde(default)]
    pub published_at: String,
}

impl LivePart {
    pub fn builder() -> LivePartBuilder {
        <LivePartBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LivePartBuilder {
    index: Option<i64>,
    permalink: Option<String>,
    platform_post_id: Option<String>,
    published_at: Option<String>,
}

impl LivePartBuilder {
    pub fn index(mut self, value: i64) -> Self {
        self.index = Some(value);
        self
    }

    pub fn permalink(mut self, value: impl Into<String>) -> Self {
        self.permalink = Some(value.into());
        self
    }

    pub fn platform_post_id(mut self, value: impl Into<String>) -> Self {
        self.platform_post_id = Some(value.into());
        self
    }

    pub fn published_at(mut self, value: impl Into<String>) -> Self {
        self.published_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`LivePart`].
    /// This method will fail if any of the following fields are not set:
    /// - [`index`](LivePartBuilder::index)
    /// - [`published_at`](LivePartBuilder::published_at)
    pub fn build(self) -> Result<LivePart, BuildError> {
        Ok(LivePart {
            index: self
                .index
                .ok_or_else(|| BuildError::missing_field("index"))?,
            permalink: self.permalink,
            platform_post_id: self.platform_post_id,
            published_at: self
                .published_at
                .ok_or_else(|| BuildError::missing_field("published_at"))?,
        })
    }
}
