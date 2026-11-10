pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerUsage {
    #[serde(default)]
    pub channels: i64,
    #[serde(default)]
    pub days: Vec<PartnerUsageDay>,
    #[serde(default)]
    pub workspaces: i64,
}

impl PartnerUsage {
    pub fn builder() -> PartnerUsageBuilder {
        <PartnerUsageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerUsageBuilder {
    channels: Option<i64>,
    days: Option<Vec<PartnerUsageDay>>,
    workspaces: Option<i64>,
}

impl PartnerUsageBuilder {
    pub fn channels(mut self, value: i64) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn days(mut self, value: Vec<PartnerUsageDay>) -> Self {
        self.days = Some(value);
        self
    }

    pub fn workspaces(mut self, value: i64) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerUsage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channels`](PartnerUsageBuilder::channels)
    /// - [`days`](PartnerUsageBuilder::days)
    /// - [`workspaces`](PartnerUsageBuilder::workspaces)
    pub fn build(self) -> Result<PartnerUsage, BuildError> {
        Ok(PartnerUsage {
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            days: self.days.ok_or_else(|| BuildError::missing_field("days"))?,
            workspaces: self
                .workspaces
                .ok_or_else(|| BuildError::missing_field("workspaces"))?,
        })
    }
}
