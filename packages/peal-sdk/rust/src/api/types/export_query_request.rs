pub use crate::prelude::*;

/// Query parameters for export
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ExportQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<AnalyticsExportFormat>,
    pub kind: AnalyticsExportKind,
}

impl ExportQueryRequest {
    pub fn builder() -> ExportQueryRequestBuilder {
        <ExportQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ExportQueryRequestBuilder {
    days: Option<String>,
    from: Option<CalendarDay>,
    time_zone: Option<String>,
    to: Option<CalendarDay>,
    format: Option<AnalyticsExportFormat>,
    kind: Option<AnalyticsExportKind>,
}

impl ExportQueryRequestBuilder {
    pub fn days(mut self, value: impl Into<String>) -> Self {
        self.days = Some(value.into());
        self
    }

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

    pub fn format(mut self, value: AnalyticsExportFormat) -> Self {
        self.format = Some(value);
        self
    }

    pub fn kind(mut self, value: AnalyticsExportKind) -> Self {
        self.kind = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ExportQueryRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`time_zone`](ExportQueryRequestBuilder::time_zone)
    /// - [`kind`](ExportQueryRequestBuilder::kind)
    pub fn build(self) -> Result<ExportQueryRequest, BuildError> {
        Ok(ExportQueryRequest {
            days: self.days,
            from: self.from,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            to: self.to,
            format: self.format,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
        })
    }
}
