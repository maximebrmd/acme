pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct NewBoost {
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
    /// An ISO 4217 currency code, in capitals: `EUR`, `USD`.
    #[serde(default)]
    pub currency: String,
    #[serde(rename = "endsAt")]
    #[serde(default)]
    pub ends_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payer: Option<String>,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(rename = "specialAdCategory")]
    pub special_ad_category: SpecialAdCategory,
    #[serde(rename = "startsAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub starts_at: Option<String>,
}

impl NewBoost {
    pub fn builder() -> NewBoostBuilder {
        <NewBoostBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewBoostBuilder {
    account_id: Option<String>,
    audience: Option<BoostAudience>,
    beneficiary: Option<String>,
    budget: Option<BoostBudget>,
    channel_id: Option<String>,
    currency: Option<String>,
    ends_at: Option<String>,
    payer: Option<String>,
    post_id: Option<String>,
    special_ad_category: Option<SpecialAdCategory>,
    starts_at: Option<String>,
}

impl NewBoostBuilder {
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

    pub fn currency(mut self, value: impl Into<String>) -> Self {
        self.currency = Some(value.into());
        self
    }

    pub fn ends_at(mut self, value: impl Into<String>) -> Self {
        self.ends_at = Some(value.into());
        self
    }

    pub fn payer(mut self, value: impl Into<String>) -> Self {
        self.payer = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn special_ad_category(mut self, value: SpecialAdCategory) -> Self {
        self.special_ad_category = Some(value);
        self
    }

    pub fn starts_at(mut self, value: impl Into<String>) -> Self {
        self.starts_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewBoost`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account_id`](NewBoostBuilder::account_id)
    /// - [`audience`](NewBoostBuilder::audience)
    /// - [`budget`](NewBoostBuilder::budget)
    /// - [`channel_id`](NewBoostBuilder::channel_id)
    /// - [`currency`](NewBoostBuilder::currency)
    /// - [`ends_at`](NewBoostBuilder::ends_at)
    /// - [`post_id`](NewBoostBuilder::post_id)
    /// - [`special_ad_category`](NewBoostBuilder::special_ad_category)
    pub fn build(self) -> Result<NewBoost, BuildError> {
        Ok(NewBoost {
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
            currency: self
                .currency
                .ok_or_else(|| BuildError::missing_field("currency"))?,
            ends_at: self
                .ends_at
                .ok_or_else(|| BuildError::missing_field("ends_at"))?,
            payer: self.payer,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            special_ad_category: self
                .special_ad_category
                .ok_or_else(|| BuildError::missing_field("special_ad_category"))?,
            starts_at: self.starts_at,
        })
    }
}
