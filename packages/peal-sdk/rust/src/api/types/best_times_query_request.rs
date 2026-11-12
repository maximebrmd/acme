pub use crate::prelude::*;

/// Query parameters for bestTimes
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct BestTimesQueryRequest {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days: Option<String>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
}

impl BestTimesQueryRequest {
    pub fn builder() -> BestTimesQueryRequestBuilder {
        <BestTimesQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BestTimesQueryRequestBuilder {
    channel_id: Option<String>,
    days: Option<String>,
    time_zone: Option<String>,
}

impl BestTimesQueryRequestBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn days(mut self, value: impl Into<String>) -> Self {
        self.days = Some(value.into());
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`BestTimesQueryRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](BestTimesQueryRequestBuilder::channel_id)
    /// - [`time_zone`](BestTimesQueryRequestBuilder::time_zone)
    pub fn build(self) -> Result<BestTimesQueryRequest, BuildError> {
        Ok(BestTimesQueryRequest {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            days: self.days,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
        })
    }
}
