pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct Boost {
    #[serde(rename = "accountId")]
    #[serde(default)]
    pub account_id: String,
    #[serde(default)]
    pub audience: BoostAudience,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub beneficiary: Option<String>,
    pub budget: BoostBudget,
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    #[serde(default)]
    pub committed: i64,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    /// An ISO 4217 currency code, in capitals: `EUR`, `USD`.
    #[serde(default)]
    pub currency: String,
    #[serde(rename = "endsAt")]
    #[serde(default)]
    pub ends_at: String,
    #[serde(rename = "failureReason")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_reason: Option<BoostFailureReason>,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "networkCode")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_code: Option<String>,
    pub objective: BoostObjective,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payer: Option<String>,
    pub platform: BoostPlatform,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(rename = "startsAt")]
    #[serde(default)]
    pub starts_at: String,
    pub state: BoostState,
    #[serde(rename = "stateAt")]
    #[serde(default)]
    pub state_at: String,
    #[serde(rename = "updatedAt")]
    #[serde(default)]
    pub updated_at: String,
}

impl Boost {
    pub fn builder() -> BoostBuilder {
        <BoostBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BoostBuilder {
    account_id: Option<String>,
    audience: Option<BoostAudience>,
    beneficiary: Option<String>,
    budget: Option<BoostBudget>,
    channel_id: Option<String>,
    committed: Option<i64>,
    created_at: Option<String>,
    currency: Option<String>,
    ends_at: Option<String>,
    failure_reason: Option<BoostFailureReason>,
    id: Option<String>,
    network_code: Option<String>,
    objective: Option<BoostObjective>,
    payer: Option<String>,
    platform: Option<BoostPlatform>,
    post_id: Option<String>,
    starts_at: Option<String>,
    state: Option<BoostState>,
    state_at: Option<String>,
    updated_at: Option<String>,
}

impl BoostBuilder {
    pub fn account_id(mut self, value: impl Into<String>) -> Self {
        self.account_id = Some(value.into());
        self
    }

    pub fn audience(mut self, value: BoostAudience) -> Self {
        self.audience = Some(value);
        self
    }

    pub fn beneficiary(mut self, value: impl Into<String>) -> Self {
        self.beneficiary = Some(value.into());
        self
    }

    pub fn budget(mut self, value: BoostBudget) -> Self {
        self.budget = Some(value);
        self
    }

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn committed(mut self, value: i64) -> Self {
        self.committed = Some(value);
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn currency(mut self, value: impl Into<String>) -> Self {
        self.currency = Some(value.into());
        self
    }

    pub fn ends_at(mut self, value: impl Into<String>) -> Self {
        self.ends_at = Some(value.into());
        self
    }

    pub fn failure_reason(mut self, value: BoostFailureReason) -> Self {
        self.failure_reason = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn network_code(mut self, value: impl Into<String>) -> Self {
        self.network_code = Some(value.into());
        self
    }

    pub fn objective(mut self, value: BoostObjective) -> Self {
        self.objective = Some(value);
        self
    }

    pub fn payer(mut self, value: impl Into<String>) -> Self {
        self.payer = Some(value.into());
        self
    }

    pub fn platform(mut self, value: BoostPlatform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn starts_at(mut self, value: impl Into<String>) -> Self {
        self.starts_at = Some(value.into());
        self
    }

    pub fn state(mut self, value: BoostState) -> Self {
        self.state = Some(value);
        self
    }

    pub fn state_at(mut self, value: impl Into<String>) -> Self {
        self.state_at = Some(value.into());
        self
    }

    pub fn updated_at(mut self, value: impl Into<String>) -> Self {
        self.updated_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Boost`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account_id`](BoostBuilder::account_id)
    /// - [`audience`](BoostBuilder::audience)
    /// - [`budget`](BoostBuilder::budget)
    /// - [`channel_id`](BoostBuilder::channel_id)
    /// - [`committed`](BoostBuilder::committed)
    /// - [`created_at`](BoostBuilder::created_at)
    /// - [`currency`](BoostBuilder::currency)
    /// - [`ends_at`](BoostBuilder::ends_at)
    /// - [`id`](BoostBuilder::id)
    /// - [`objective`](BoostBuilder::objective)
    /// - [`platform`](BoostBuilder::platform)
    /// - [`post_id`](BoostBuilder::post_id)
    /// - [`starts_at`](BoostBuilder::starts_at)
    /// - [`state`](BoostBuilder::state)
    /// - [`state_at`](BoostBuilder::state_at)
    /// - [`updated_at`](BoostBuilder::updated_at)
    pub fn build(self) -> Result<Boost, BuildError> {
        Ok(Boost {
            account_id: self
                .account_id
                .ok_or_else(|| BuildError::missing_field("account_id"))?,
            audience: self
                .audience
                .ok_or_else(|| BuildError::missing_field("audience"))?,
            beneficiary: self.beneficiary,
            budget: self
                .budget
                .ok_or_else(|| BuildError::missing_field("budget"))?,
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            committed: self
                .committed
                .ok_or_else(|| BuildError::missing_field("committed"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            currency: self
                .currency
                .ok_or_else(|| BuildError::missing_field("currency"))?,
            ends_at: self
                .ends_at
                .ok_or_else(|| BuildError::missing_field("ends_at"))?,
            failure_reason: self.failure_reason,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            network_code: self.network_code,
            objective: self
                .objective
                .ok_or_else(|| BuildError::missing_field("objective"))?,
            payer: self.payer,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            starts_at: self
                .starts_at
                .ok_or_else(|| BuildError::missing_field("starts_at"))?,
            state: self
                .state
                .ok_or_else(|| BuildError::missing_field("state"))?,
            state_at: self
                .state_at
                .ok_or_else(|| BuildError::missing_field("state_at"))?,
            updated_at: self
                .updated_at
                .ok_or_else(|| BuildError::missing_field("updated_at"))?,
        })
    }
}
