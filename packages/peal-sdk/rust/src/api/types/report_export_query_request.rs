pub use crate::prelude::*;

/// Query parameters for reportExport
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ReportExportQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days: Option<String>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
}

impl ReportExportQueryRequest {
    pub fn builder() -> ReportExportQueryRequestBuilder {
        <ReportExportQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReportExportQueryRequestBuilder {
    days: Option<String>,
    time_zone: Option<String>,
}

impl ReportExportQueryRequestBuilder {
    pub fn days(mut self, value: impl Into<String>) -> Self {
        self.days = Some(value.into());
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ReportExportQueryRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`time_zone`](ReportExportQueryRequestBuilder::time_zone)
    pub fn build(self) -> Result<ReportExportQueryRequest, BuildError> {
        Ok(ReportExportQueryRequest {
            days: self.days,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
        })
    }
}
