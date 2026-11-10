pub use crate::prelude::*;

/// Query parameters for dashboard
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct DashboardQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
    #[serde(rename = "topPosts")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_posts: Option<String>,
}

impl DashboardQueryRequest {
    pub fn builder() -> DashboardQueryRequestBuilder {
        <DashboardQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct DashboardQueryRequestBuilder {
    days: Option<String>,
    from: Option<CalendarDay>,
    time_zone: Option<String>,
    to: Option<CalendarDay>,
    top_posts: Option<String>,
}

impl DashboardQueryRequestBuilder {
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

    pub fn top_posts(mut self, value: impl Into<String>) -> Self {
        self.top_posts = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`DashboardQueryRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`time_zone`](DashboardQueryRequestBuilder::time_zone)
    pub fn build(self) -> Result<DashboardQueryRequest, BuildError> {
        Ok(DashboardQueryRequest {
            days: self.days,
            from: self.from,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            to: self.to,
            top_posts: self.top_posts,
        })
    }
}
