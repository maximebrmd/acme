pub use crate::prelude::*;

/// Query parameters for partner
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
}

impl PartnerQueryRequest {
    pub fn builder() -> PartnerQueryRequestBuilder {
        <PartnerQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerQueryRequestBuilder {
    before: Option<String>,
    from: Option<CalendarDay>,
    limit: Option<String>,
    to: Option<CalendarDay>,
}

impl PartnerQueryRequestBuilder {
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

    /// Consumes the builder and constructs a [`PartnerQueryRequest`].
    pub fn build(self) -> Result<PartnerQueryRequest, BuildError> {
        Ok(PartnerQueryRequest {
            before: self.before,
            from: self.from,
            limit: self.limit,
            to: self.to,
        })
    }
}
