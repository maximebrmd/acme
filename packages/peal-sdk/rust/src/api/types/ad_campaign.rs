pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AdCampaign {
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(rename = "dailyBudget")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub daily_budget: Option<i64>,
    #[serde(rename = "endsAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ends_at: Option<String>,
    #[serde(rename = "externalId")]
    #[serde(default)]
    pub external_id: String,
    #[serde(default)]
    pub name: String,
    pub objective: CampaignObjective,
    #[serde(rename = "rawStatus")]
    #[serde(default)]
    pub raw_status: String,
    #[serde(rename = "startsAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub starts_at: Option<String>,
    pub status: AdObjectStatus,
    #[serde(rename = "syncedAt")]
    #[serde(default)]
    pub synced_at: String,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(rename = "totalBudget")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_budget: Option<i64>,
    #[serde(default)]
    pub totals: PaidTotals,
}

impl AdCampaign {
    pub fn builder() -> AdCampaignBuilder {
        <AdCampaignBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdCampaignBuilder {
    daily_budget: Option<i64>,
    ends_at: Option<String>,
    external_id: Option<String>,
    name: Option<String>,
    objective: Option<CampaignObjective>,
    raw_status: Option<String>,
    starts_at: Option<String>,
    status: Option<AdObjectStatus>,
    synced_at: Option<String>,
    total_budget: Option<i64>,
    totals: Option<PaidTotals>,
}

impl AdCampaignBuilder {
    pub fn daily_budget(mut self, value: i64) -> Self {
        self.daily_budget = Some(value);
        self
    }

    pub fn ends_at(mut self, value: impl Into<String>) -> Self {
        self.ends_at = Some(value.into());
        self
    }

    pub fn external_id(mut self, value: impl Into<String>) -> Self {
        self.external_id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn objective(mut self, value: CampaignObjective) -> Self {
        self.objective = Some(value);
        self
    }

    pub fn raw_status(mut self, value: impl Into<String>) -> Self {
        self.raw_status = Some(value.into());
        self
    }

    pub fn starts_at(mut self, value: impl Into<String>) -> Self {
        self.starts_at = Some(value.into());
        self
    }

    pub fn status(mut self, value: AdObjectStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn synced_at(mut self, value: impl Into<String>) -> Self {
        self.synced_at = Some(value.into());
        self
    }

    pub fn total_budget(mut self, value: i64) -> Self {
        self.total_budget = Some(value);
        self
    }

    pub fn totals(mut self, value: PaidTotals) -> Self {
        self.totals = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdCampaign`].
    /// This method will fail if any of the following fields are not set:
    /// - [`external_id`](AdCampaignBuilder::external_id)
    /// - [`name`](AdCampaignBuilder::name)
    /// - [`objective`](AdCampaignBuilder::objective)
    /// - [`raw_status`](AdCampaignBuilder::raw_status)
    /// - [`status`](AdCampaignBuilder::status)
    /// - [`synced_at`](AdCampaignBuilder::synced_at)
    /// - [`totals`](AdCampaignBuilder::totals)
    pub fn build(self) -> Result<AdCampaign, BuildError> {
        Ok(AdCampaign {
            daily_budget: self.daily_budget,
            ends_at: self.ends_at,
            external_id: self
                .external_id
                .ok_or_else(|| BuildError::missing_field("external_id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            objective: self
                .objective
                .ok_or_else(|| BuildError::missing_field("objective"))?,
            raw_status: self
                .raw_status
                .ok_or_else(|| BuildError::missing_field("raw_status"))?,
            starts_at: self.starts_at,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            synced_at: self
                .synced_at
                .ok_or_else(|| BuildError::missing_field("synced_at"))?,
            total_budget: self.total_budget,
            totals: self
                .totals
                .ok_or_else(|| BuildError::missing_field("totals"))?,
        })
    }
}
