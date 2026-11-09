pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MetricsSnapshot {
    #[serde(rename = "collectedAt")]
    #[serde(default)]
    pub collected_at: String,
    #[serde(default)]
    pub metrics: PostMetrics,
}

impl MetricsSnapshot {
    pub fn builder() -> MetricsSnapshotBuilder {
        <MetricsSnapshotBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MetricsSnapshotBuilder {
    collected_at: Option<String>,
    metrics: Option<PostMetrics>,
}

impl MetricsSnapshotBuilder {
    pub fn collected_at(mut self, value: impl Into<String>) -> Self {
        self.collected_at = Some(value.into());
        self
    }

    pub fn metrics(mut self, value: PostMetrics) -> Self {
        self.metrics = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MetricsSnapshot`].
    /// This method will fail if any of the following fields are not set:
    /// - [`collected_at`](MetricsSnapshotBuilder::collected_at)
    /// - [`metrics`](MetricsSnapshotBuilder::metrics)
    pub fn build(self) -> Result<MetricsSnapshot, BuildError> {
        Ok(MetricsSnapshot {
            collected_at: self
                .collected_at
                .ok_or_else(|| BuildError::missing_field("collected_at"))?,
            metrics: self
                .metrics
                .ok_or_else(|| BuildError::missing_field("metrics"))?,
        })
    }
}
