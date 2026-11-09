pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TargetMetrics {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(default)]
    pub collecting: bool,
    #[serde(rename = "lastCollectedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_collected_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest: Option<PostMetrics>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permalink: Option<String>,
    #[serde(rename = "publishedAt")]
    #[serde(default)]
    pub published_at: String,
    #[serde(default)]
    pub snapshots: Vec<MetricsSnapshot>,
    #[serde(rename = "targetId")]
    #[serde(default)]
    pub target_id: String,
}

impl TargetMetrics {
    pub fn builder() -> TargetMetricsBuilder {
        <TargetMetricsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TargetMetricsBuilder {
    channel_id: Option<String>,
    collecting: Option<bool>,
    last_collected_at: Option<String>,
    latest: Option<PostMetrics>,
    permalink: Option<String>,
    published_at: Option<String>,
    snapshots: Option<Vec<MetricsSnapshot>>,
    target_id: Option<String>,
}

impl TargetMetricsBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn collecting(mut self, value: bool) -> Self {
        self.collecting = Some(value);
        self
    }

    pub fn last_collected_at(mut self, value: impl Into<String>) -> Self {
        self.last_collected_at = Some(value.into());
        self
    }

    pub fn latest(mut self, value: PostMetrics) -> Self {
        self.latest = Some(value);
        self
    }

    pub fn permalink(mut self, value: impl Into<String>) -> Self {
        self.permalink = Some(value.into());
        self
    }

    pub fn published_at(mut self, value: impl Into<String>) -> Self {
        self.published_at = Some(value.into());
        self
    }

    pub fn snapshots(mut self, value: Vec<MetricsSnapshot>) -> Self {
        self.snapshots = Some(value);
        self
    }

    pub fn target_id(mut self, value: impl Into<String>) -> Self {
        self.target_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`TargetMetrics`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](TargetMetricsBuilder::channel_id)
    /// - [`collecting`](TargetMetricsBuilder::collecting)
    /// - [`published_at`](TargetMetricsBuilder::published_at)
    /// - [`snapshots`](TargetMetricsBuilder::snapshots)
    /// - [`target_id`](TargetMetricsBuilder::target_id)
    pub fn build(self) -> Result<TargetMetrics, BuildError> {
        Ok(TargetMetrics {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            collecting: self
                .collecting
                .ok_or_else(|| BuildError::missing_field("collecting"))?,
            last_collected_at: self.last_collected_at,
            latest: self.latest,
            permalink: self.permalink,
            published_at: self
                .published_at
                .ok_or_else(|| BuildError::missing_field("published_at"))?,
            snapshots: self
                .snapshots
                .ok_or_else(|| BuildError::missing_field("snapshots"))?,
            target_id: self
                .target_id
                .ok_or_else(|| BuildError::missing_field("target_id"))?,
        })
    }
}
