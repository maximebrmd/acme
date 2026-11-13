pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RateCardXRates {
    #[serde(rename = "dmCreate")]
    #[serde(default)]
    pub dm_create: i64,
    #[serde(rename = "dmEventRead")]
    #[serde(default)]
    pub dm_event_read: i64,
    #[serde(rename = "ownedRead")]
    #[serde(default)]
    pub owned_read: i64,
    #[serde(rename = "postCreate")]
    #[serde(default)]
    pub post_create: i64,
    #[serde(rename = "postCreateWithUrl")]
    #[serde(default)]
    pub post_create_with_url: i64,
    #[serde(rename = "postRead")]
    #[serde(default)]
    pub post_read: i64,
    #[serde(rename = "userRead")]
    #[serde(default)]
    pub user_read: i64,
}

impl RateCardXRates {
    pub fn builder() -> RateCardXRatesBuilder {
        <RateCardXRatesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RateCardXRatesBuilder {
    dm_create: Option<i64>,
    dm_event_read: Option<i64>,
    owned_read: Option<i64>,
    post_create: Option<i64>,
    post_create_with_url: Option<i64>,
    post_read: Option<i64>,
    user_read: Option<i64>,
}

impl RateCardXRatesBuilder {
    pub fn dm_create(mut self, value: i64) -> Self {
        self.dm_create = Some(value);
        self
    }

    pub fn dm_event_read(mut self, value: i64) -> Self {
        self.dm_event_read = Some(value);
        self
    }

    pub fn owned_read(mut self, value: i64) -> Self {
        self.owned_read = Some(value);
        self
    }

    pub fn post_create(mut self, value: i64) -> Self {
        self.post_create = Some(value);
        self
    }

    pub fn post_create_with_url(mut self, value: i64) -> Self {
        self.post_create_with_url = Some(value);
        self
    }

    pub fn post_read(mut self, value: i64) -> Self {
        self.post_read = Some(value);
        self
    }

    pub fn user_read(mut self, value: i64) -> Self {
        self.user_read = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RateCardXRates`].
    /// This method will fail if any of the following fields are not set:
    /// - [`dm_create`](RateCardXRatesBuilder::dm_create)
    /// - [`dm_event_read`](RateCardXRatesBuilder::dm_event_read)
    /// - [`owned_read`](RateCardXRatesBuilder::owned_read)
    /// - [`post_create`](RateCardXRatesBuilder::post_create)
    /// - [`post_create_with_url`](RateCardXRatesBuilder::post_create_with_url)
    /// - [`post_read`](RateCardXRatesBuilder::post_read)
    /// - [`user_read`](RateCardXRatesBuilder::user_read)
    pub fn build(self) -> Result<RateCardXRates, BuildError> {
        Ok(RateCardXRates {
            dm_create: self
                .dm_create
                .ok_or_else(|| BuildError::missing_field("dm_create"))?,
            dm_event_read: self
                .dm_event_read
                .ok_or_else(|| BuildError::missing_field("dm_event_read"))?,
            owned_read: self
                .owned_read
                .ok_or_else(|| BuildError::missing_field("owned_read"))?,
            post_create: self
                .post_create
                .ok_or_else(|| BuildError::missing_field("post_create"))?,
            post_create_with_url: self
                .post_create_with_url
                .ok_or_else(|| BuildError::missing_field("post_create_with_url"))?,
            post_read: self
                .post_read
                .ok_or_else(|| BuildError::missing_field("post_read"))?,
            user_read: self
                .user_read
                .ok_or_else(|| BuildError::missing_field("user_read"))?,
        })
    }
}
