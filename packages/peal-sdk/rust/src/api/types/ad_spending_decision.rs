pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AdSpendingDecision {
    #[serde(default)]
    pub enabled: bool,
    #[serde(rename = "monthlyCeiling")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub monthly_ceiling: Option<AdMoney>,
}

impl AdSpendingDecision {
    pub fn builder() -> AdSpendingDecisionBuilder {
        <AdSpendingDecisionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdSpendingDecisionBuilder {
    enabled: Option<bool>,
    monthly_ceiling: Option<AdMoney>,
}

impl AdSpendingDecisionBuilder {
    pub fn enabled(mut self, value: bool) -> Self {
        self.enabled = Some(value);
        self
    }

    pub fn monthly_ceiling(mut self, value: AdMoney) -> Self {
        self.monthly_ceiling = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdSpendingDecision`].
    /// This method will fail if any of the following fields are not set:
    /// - [`enabled`](AdSpendingDecisionBuilder::enabled)
    pub fn build(self) -> Result<AdSpendingDecision, BuildError> {
        Ok(AdSpendingDecision {
            enabled: self
                .enabled
                .ok_or_else(|| BuildError::missing_field("enabled"))?,
            monthly_ceiling: self.monthly_ceiling,
        })
    }
}
