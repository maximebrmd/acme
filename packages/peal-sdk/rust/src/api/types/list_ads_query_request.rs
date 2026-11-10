pub use crate::prelude::*;

/// Query parameters for listAds
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ListAdsQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
    #[serde(rename = "campaignId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub campaign_id: Option<String>,
}

impl ListAdsQueryRequest {
    pub fn builder() -> ListAdsQueryRequestBuilder {
        <ListAdsQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ListAdsQueryRequestBuilder {
    from: Option<CalendarDay>,
    to: Option<CalendarDay>,
    campaign_id: Option<String>,
}

impl ListAdsQueryRequestBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    pub fn campaign_id(mut self, value: impl Into<String>) -> Self {
        self.campaign_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ListAdsQueryRequest`].
    pub fn build(self) -> Result<ListAdsQueryRequest, BuildError> {
        Ok(ListAdsQueryRequest {
            from: self.from,
            to: self.to,
            campaign_id: self.campaign_id,
        })
    }
}
