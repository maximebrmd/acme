pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PlatformCapabilitiesAnalytics {
    #[serde(rename = "perPost")]
    #[serde(default)]
    pub per_post: bool,
}

impl PlatformCapabilitiesAnalytics {
    pub fn builder() -> PlatformCapabilitiesAnalyticsBuilder {
        <PlatformCapabilitiesAnalyticsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlatformCapabilitiesAnalyticsBuilder {
    per_post: Option<bool>,
}

impl PlatformCapabilitiesAnalyticsBuilder {
    pub fn per_post(mut self, value: bool) -> Self {
        self.per_post = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlatformCapabilitiesAnalytics`].
    /// This method will fail if any of the following fields are not set:
    /// - [`per_post`](PlatformCapabilitiesAnalyticsBuilder::per_post)
    pub fn build(self) -> Result<PlatformCapabilitiesAnalytics, BuildError> {
        Ok(PlatformCapabilitiesAnalytics {
            per_post: self
                .per_post
                .ok_or_else(|| BuildError::missing_field("per_post"))?,
        })
    }
}
