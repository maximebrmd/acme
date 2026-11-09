pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PeriodUsage {
    #[serde(rename = "resetsAt")]
    #[serde(default)]
    pub resets_at: String,
    #[serde(default)]
    pub used: i64,
}

impl PeriodUsage {
    pub fn builder() -> PeriodUsageBuilder {
        <PeriodUsageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PeriodUsageBuilder {
    resets_at: Option<String>,
    used: Option<i64>,
}

impl PeriodUsageBuilder {
    pub fn resets_at(mut self, value: impl Into<String>) -> Self {
        self.resets_at = Some(value.into());
        self
    }

    pub fn used(mut self, value: i64) -> Self {
        self.used = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PeriodUsage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`resets_at`](PeriodUsageBuilder::resets_at)
    /// - [`used`](PeriodUsageBuilder::used)
    pub fn build(self) -> Result<PeriodUsage, BuildError> {
        Ok(PeriodUsage {
            resets_at: self
                .resets_at
                .ok_or_else(|| BuildError::missing_field("resets_at"))?,
            used: self.used.ok_or_else(|| BuildError::missing_field("used"))?,
        })
    }
}
