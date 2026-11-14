pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AdAccount {
    pub access: AdAccess,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(rename = "amountSpent")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount_spent: Option<i64>,
    #[serde(rename = "connectedAt")]
    #[serde(default)]
    pub connected_at: String,
    #[serde(rename = "connectionId")]
    #[serde(default)]
    pub connection_id: String,
    /// An ISO 4217 currency code, in capitals: `EUR`, `USD`.
    #[serde(default)]
    pub currency: String,
    #[serde(rename = "externalId")]
    #[serde(default)]
    pub external_id: String,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "minorUnitDigits")]
    #[serde(default)]
    #[serde(with = "crate::core::number_serializers")]
    pub minor_unit_digits: f64,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(rename = "monthlyCeiling")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub monthly_ceiling: Option<i64>,
    #[serde(default)]
    pub name: String,
    pub network: AdNetwork,
    #[serde(rename = "newAdsUntrackedUntil")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_ads_untracked_until: Option<String>,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(rename = "spendCap")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spend_cap: Option<i64>,
    #[serde(rename = "spendingEnabled")]
    #[serde(default)]
    pub spending_enabled: bool,
    pub status: AdAccountStatus,
    #[serde(rename = "syncedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub synced_at: Option<String>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
}

impl AdAccount {
    pub fn builder() -> AdAccountBuilder {
        <AdAccountBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdAccountBuilder {
    access: Option<AdAccess>,
    amount_spent: Option<i64>,
    connected_at: Option<String>,
    connection_id: Option<String>,
    currency: Option<String>,
    external_id: Option<String>,
    id: Option<String>,
    minor_unit_digits: Option<f64>,
    monthly_ceiling: Option<i64>,
    name: Option<String>,
    network: Option<AdNetwork>,
    new_ads_untracked_until: Option<String>,
    spend_cap: Option<i64>,
    spending_enabled: Option<bool>,
    status: Option<AdAccountStatus>,
    synced_at: Option<String>,
    time_zone: Option<String>,
}

impl AdAccountBuilder {
    pub fn access(mut self, value: AdAccess) -> Self {
        self.access = Some(value);
        self
    }

    pub fn amount_spent(mut self, value: i64) -> Self {
        self.amount_spent = Some(value);
        self
    }

    pub fn connected_at(mut self, value: impl Into<String>) -> Self {
        self.connected_at = Some(value.into());
        self
    }

    pub fn connection_id(mut self, value: impl Into<String>) -> Self {
        self.connection_id = Some(value.into());
        self
    }

    pub fn currency(mut self, value: impl Into<String>) -> Self {
        self.currency = Some(value.into());
        self
    }

    pub fn external_id(mut self, value: impl Into<String>) -> Self {
        self.external_id = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn minor_unit_digits(mut self, value: f64) -> Self {
        self.minor_unit_digits = Some(value);
        self
    }

    pub fn monthly_ceiling(mut self, value: i64) -> Self {
        self.monthly_ceiling = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn network(mut self, value: AdNetwork) -> Self {
        self.network = Some(value);
        self
    }

    pub fn new_ads_untracked_until(mut self, value: impl Into<String>) -> Self {
        self.new_ads_untracked_until = Some(value.into());
        self
    }

    pub fn spend_cap(mut self, value: i64) -> Self {
        self.spend_cap = Some(value);
        self
    }

    pub fn spending_enabled(mut self, value: bool) -> Self {
        self.spending_enabled = Some(value);
        self
    }

    pub fn status(mut self, value: AdAccountStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn synced_at(mut self, value: impl Into<String>) -> Self {
        self.synced_at = Some(value.into());
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AdAccount`].
    /// This method will fail if any of the following fields are not set:
    /// - [`access`](AdAccountBuilder::access)
    /// - [`connected_at`](AdAccountBuilder::connected_at)
    /// - [`connection_id`](AdAccountBuilder::connection_id)
    /// - [`currency`](AdAccountBuilder::currency)
    /// - [`external_id`](AdAccountBuilder::external_id)
    /// - [`id`](AdAccountBuilder::id)
    /// - [`minor_unit_digits`](AdAccountBuilder::minor_unit_digits)
    /// - [`name`](AdAccountBuilder::name)
    /// - [`network`](AdAccountBuilder::network)
    /// - [`spending_enabled`](AdAccountBuilder::spending_enabled)
    /// - [`status`](AdAccountBuilder::status)
    /// - [`time_zone`](AdAccountBuilder::time_zone)
    pub fn build(self) -> Result<AdAccount, BuildError> {
        Ok(AdAccount {
            access: self
                .access
                .ok_or_else(|| BuildError::missing_field("access"))?,
            amount_spent: self.amount_spent,
            connected_at: self
                .connected_at
                .ok_or_else(|| BuildError::missing_field("connected_at"))?,
            connection_id: self
                .connection_id
                .ok_or_else(|| BuildError::missing_field("connection_id"))?,
            currency: self
                .currency
                .ok_or_else(|| BuildError::missing_field("currency"))?,
            external_id: self
                .external_id
                .ok_or_else(|| BuildError::missing_field("external_id"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            minor_unit_digits: self
                .minor_unit_digits
                .ok_or_else(|| BuildError::missing_field("minor_unit_digits"))?,
            monthly_ceiling: self.monthly_ceiling,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            network: self
                .network
                .ok_or_else(|| BuildError::missing_field("network"))?,
            new_ads_untracked_until: self.new_ads_untracked_until,
            spend_cap: self.spend_cap,
            spending_enabled: self
                .spending_enabled
                .ok_or_else(|| BuildError::missing_field("spending_enabled"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            synced_at: self.synced_at,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
        })
    }
}
