pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostAnalytics {
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(default)]
    pub targets: Vec<TargetMetrics>,
}

impl PostAnalytics {
    pub fn builder() -> PostAnalyticsBuilder {
        <PostAnalyticsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostAnalyticsBuilder {
    post_id: Option<String>,
    targets: Option<Vec<TargetMetrics>>,
}

impl PostAnalyticsBuilder {
    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn targets(mut self, value: Vec<TargetMetrics>) -> Self {
        self.targets = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostAnalytics`].
    /// This method will fail if any of the following fields are not set:
    /// - [`post_id`](PostAnalyticsBuilder::post_id)
    /// - [`targets`](PostAnalyticsBuilder::targets)
    pub fn build(self) -> Result<PostAnalytics, BuildError> {
        Ok(PostAnalytics {
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            targets: self
                .targets
                .ok_or_else(|| BuildError::missing_field("targets"))?,
        })
    }
}
