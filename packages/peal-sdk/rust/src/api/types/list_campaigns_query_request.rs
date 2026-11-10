pub use crate::prelude::*;

/// Query parameters for listCampaigns
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ListCampaignsQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
}

impl ListCampaignsQueryRequest {
    pub fn builder() -> ListCampaignsQueryRequestBuilder {
        <ListCampaignsQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ListCampaignsQueryRequestBuilder {
    from: Option<CalendarDay>,
    to: Option<CalendarDay>,
}

impl ListCampaignsQueryRequestBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ListCampaignsQueryRequest`].
    pub fn build(self) -> Result<ListCampaignsQueryRequest, BuildError> {
        Ok(ListCampaignsQueryRequest {
            from: self.from,
            to: self.to,
        })
    }
}
