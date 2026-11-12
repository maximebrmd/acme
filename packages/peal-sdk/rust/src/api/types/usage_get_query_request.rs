pub use crate::prelude::*;

/// Query parameters for get
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UsageGetQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
}

impl UsageGetQueryRequest {
    pub fn builder() -> UsageGetQueryRequestBuilder {
        <UsageGetQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UsageGetQueryRequestBuilder {
    from: Option<CalendarDay>,
    to: Option<CalendarDay>,
}

impl UsageGetQueryRequestBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UsageGetQueryRequest`].
    pub fn build(self) -> Result<UsageGetQueryRequest, BuildError> {
        Ok(UsageGetQueryRequest {
            from: self.from,
            to: self.to,
        })
    }
}
