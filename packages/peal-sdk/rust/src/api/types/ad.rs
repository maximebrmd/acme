pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct Ad {
    #[serde(rename = "adSetExternalId")]
    #[serde(default)]
    pub ad_set_external_id: String,
    #[serde(rename = "campaignExternalId")]
    #[serde(default)]
    pub campaign_external_id: String,
    #[serde(rename = "externalId")]
    #[serde(default)]
    pub external_id: String,
    #[serde(default)]
    pub name: String,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
    #[serde(rename = "rawStatus")]
    #[serde(default)]
    pub raw_status: String,
    pub status: AdObjectStatus,
    #[serde(default)]
    pub totals: PaidTotals,
}

impl Ad {
    pub fn builder() -> AdBuilder {
        <AdBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdBuilder {
    ad_set_external_id: Option<String>,
    campaign_external_id: Option<String>,
    external_id: Option<String>,
    name: Option<String>,
    post_id: Option<String>,
    raw_status: Option<String>,
    status: Option<AdObjectStatus>,
    totals: Option<PaidTotals>,
}

impl AdBuilder {
    pub fn ad_set_external_id(mut self, value: impl Into<String>) -> Self {
        self.ad_set_external_id = Some(value.into());
        self
    }

    pub fn campaign_external_id(mut self, value: impl Into<String>) -> Self {
        self.campaign_external_id = Some(value.into());
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

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn raw_status(mut self, value: impl Into<String>) -> Self {
        self.raw_status = Some(value.into());
        self
    }

    pub fn status(mut self, value: AdObjectStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn totals(mut self, value: PaidTotals) -> Self {
        self.totals = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Ad`].
    /// This method will fail if any of the following fields are not set:
    /// - [`ad_set_external_id`](AdBuilder::ad_set_external_id)
    /// - [`campaign_external_id`](AdBuilder::campaign_external_id)
    /// - [`external_id`](AdBuilder::external_id)
    /// - [`name`](AdBuilder::name)
    /// - [`raw_status`](AdBuilder::raw_status)
    /// - [`status`](AdBuilder::status)
    /// - [`totals`](AdBuilder::totals)
    pub fn build(self) -> Result<Ad, BuildError> {
        Ok(Ad {
            ad_set_external_id: self
                .ad_set_external_id
                .ok_or_else(|| BuildError::missing_field("ad_set_external_id"))?,
            campaign_external_id: self
                .campaign_external_id
                .ok_or_else(|| BuildError::missing_field("campaign_external_id"))?,
            external_id: self
                .external_id
                .ok_or_else(|| BuildError::missing_field("external_id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            post_id: self.post_id,
            raw_status: self
                .raw_status
                .ok_or_else(|| BuildError::missing_field("raw_status"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            totals: self
                .totals
                .ok_or_else(|| BuildError::missing_field("totals"))?,
        })
    }
}
