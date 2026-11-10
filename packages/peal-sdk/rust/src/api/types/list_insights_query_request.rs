pub use crate::prelude::*;

/// Query parameters for listInsights
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ListInsightsQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
}

impl ListInsightsQueryRequest {
    pub fn builder() -> ListInsightsQueryRequestBuilder {
        <ListInsightsQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ListInsightsQueryRequestBuilder {
    from: Option<CalendarDay>,
    to: Option<CalendarDay>,
}

impl ListInsightsQueryRequestBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ListInsightsQueryRequest`].
    pub fn build(self) -> Result<ListInsightsQueryRequest, BuildError> {
        Ok(ListInsightsQueryRequest {
            from: self.from,
            to: self.to,
        })
    }
}
