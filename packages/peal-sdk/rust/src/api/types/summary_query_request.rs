pub use crate::prelude::*;

/// Query parameters for summary
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SummaryQueryRequest {
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(default)]
    pub to: CalendarDay,
}

impl SummaryQueryRequest {
    pub fn builder() -> SummaryQueryRequestBuilder {
        <SummaryQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SummaryQueryRequestBuilder {
    from: Option<CalendarDay>,
    time_zone: Option<String>,
    to: Option<CalendarDay>,
}

impl SummaryQueryRequestBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`SummaryQueryRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`from`](SummaryQueryRequestBuilder::from)
    /// - [`time_zone`](SummaryQueryRequestBuilder::time_zone)
    /// - [`to`](SummaryQueryRequestBuilder::to)
    pub fn build(self) -> Result<SummaryQueryRequest, BuildError> {
        Ok(SummaryQueryRequest {
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
        })
    }
}
