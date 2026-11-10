pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerUsageDay {
    #[serde(default)]
    pub channels: i64,
    #[serde(default)]
    pub day: String,
    #[serde(default)]
    pub workspaces: i64,
}

impl PartnerUsageDay {
    pub fn builder() -> PartnerUsageDayBuilder {
        <PartnerUsageDayBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerUsageDayBuilder {
    channels: Option<i64>,
    day: Option<String>,
    workspaces: Option<i64>,
}

impl PartnerUsageDayBuilder {
    pub fn channels(mut self, value: i64) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn day(mut self, value: impl Into<String>) -> Self {
        self.day = Some(value.into());
        self
    }

    pub fn workspaces(mut self, value: i64) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerUsageDay`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channels`](PartnerUsageDayBuilder::channels)
    /// - [`day`](PartnerUsageDayBuilder::day)
    /// - [`workspaces`](PartnerUsageDayBuilder::workspaces)
    pub fn build(self) -> Result<PartnerUsageDay, BuildError> {
        Ok(PartnerUsageDay {
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            day: self.day.ok_or_else(|| BuildError::missing_field("day"))?,
            workspaces: self
                .workspaces
                .ok_or_else(|| BuildError::missing_field("workspaces"))?,
        })
    }
}
