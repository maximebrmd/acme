pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ReachableAdAccount {
    #[serde(default)]
    pub connected: bool,
    /// An ISO 4217 currency code, in capitals: `EUR`, `USD`.
    #[serde(default)]
    pub currency: String,
    #[serde(rename = "externalId")]
    #[serde(default)]
    pub external_id: String,
    #[serde(default)]
    pub name: String,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(rename = "spendCap")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spend_cap: Option<i64>,
    pub status: AdAccountStatus,
    #[serde(rename = "timeZone")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time_zone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unsupported: Option<AdAccountUnsupported>,
}

impl ReachableAdAccount {
    pub fn builder() -> ReachableAdAccountBuilder {
        <ReachableAdAccountBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReachableAdAccountBuilder {
    connected: Option<bool>,
    currency: Option<String>,
    external_id: Option<String>,
    name: Option<String>,
    spend_cap: Option<i64>,
    status: Option<AdAccountStatus>,
    time_zone: Option<String>,
    unsupported: Option<AdAccountUnsupported>,
}

impl ReachableAdAccountBuilder {
    pub fn connected(mut self, value: bool) -> Self {
        self.connected = Some(value);
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

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn spend_cap(mut self, value: i64) -> Self {
        self.spend_cap = Some(value);
        self
    }

    pub fn status(mut self, value: AdAccountStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    pub fn unsupported(mut self, value: AdAccountUnsupported) -> Self {
        self.unsupported = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ReachableAdAccount`].
    /// This method will fail if any of the following fields are not set:
    /// - [`connected`](ReachableAdAccountBuilder::connected)
    /// - [`currency`](ReachableAdAccountBuilder::currency)
    /// - [`external_id`](ReachableAdAccountBuilder::external_id)
    /// - [`name`](ReachableAdAccountBuilder::name)
    /// - [`status`](ReachableAdAccountBuilder::status)
    pub fn build(self) -> Result<ReachableAdAccount, BuildError> {
        Ok(ReachableAdAccount {
            connected: self
                .connected
                .ok_or_else(|| BuildError::missing_field("connected"))?,
            currency: self
                .currency
                .ok_or_else(|| BuildError::missing_field("currency"))?,
            external_id: self
                .external_id
                .ok_or_else(|| BuildError::missing_field("external_id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            spend_cap: self.spend_cap,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            time_zone: self.time_zone,
            unsupported: self.unsupported,
        })
    }
}
