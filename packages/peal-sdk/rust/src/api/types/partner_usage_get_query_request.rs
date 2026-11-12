pub use crate::prelude::*;

/// Query parameters for get
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerUsageGetQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
}

impl PartnerUsageGetQueryRequest {
    pub fn builder() -> PartnerUsageGetQueryRequestBuilder {
        <PartnerUsageGetQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerUsageGetQueryRequestBuilder {
    before: Option<String>,
    from: Option<CalendarDay>,
    limit: Option<String>,
    to: Option<CalendarDay>,
}

impl PartnerUsageGetQueryRequestBuilder {
    pub fn before(mut self, value: impl Into<String>) -> Self {
        self.before = Some(value.into());
        self
    }

    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerUsageGetQueryRequest`].
    pub fn build(self) -> Result<PartnerUsageGetQueryRequest, BuildError> {
        Ok(PartnerUsageGetQueryRequest {
            before: self.before,
            from: self.from,
            limit: self.limit,
            to: self.to,
        })
    }
}
