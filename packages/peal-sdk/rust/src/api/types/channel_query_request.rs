pub use crate::prelude::*;

/// Query parameters for channel
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChannelQueryRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<CalendarDay>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<CalendarDay>,
}

impl ChannelQueryRequest {
    pub fn builder() -> ChannelQueryRequestBuilder {
        <ChannelQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelQueryRequestBuilder {
    days: Option<String>,
    from: Option<CalendarDay>,
    time_zone: Option<String>,
    to: Option<CalendarDay>,
}

impl ChannelQueryRequestBuilder {
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

    /// Consumes the builder and constructs a [`ChannelQueryRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`time_zone`](ChannelQueryRequestBuilder::time_zone)
    pub fn build(self) -> Result<ChannelQueryRequest, BuildError> {
        Ok(ChannelQueryRequest {
            days: self.days,
            from: self.from,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            to: self.to,
        })
    }
}
