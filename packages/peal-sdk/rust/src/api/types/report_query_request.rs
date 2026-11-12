pub use crate::prelude::*;

/// Query parameters for report
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ReportQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days: Option<String>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,
}

impl ReportQueryRequest {
    pub fn builder() -> ReportQueryRequestBuilder {
        <ReportQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReportQueryRequestBuilder {
    days: Option<String>,
    time_zone: Option<String>,
    cursor: Option<String>,
    limit: Option<String>,
}

impl ReportQueryRequestBuilder {
    pub fn days(mut self, value: impl Into<String>) -> Self {
        self.days = Some(value.into());
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn limit(mut self, value: impl Into<String>) -> Self {
        self.limit = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ReportQueryRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`time_zone`](ReportQueryRequestBuilder::time_zone)
    pub fn build(self) -> Result<ReportQueryRequest, BuildError> {
        Ok(ReportQueryRequest {
            days: self.days,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            cursor: self.cursor,
            limit: self.limit,
        })
    }
}
