pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SchedulePost {
    #[serde(default)]
    pub at: String,
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
}

impl SchedulePost {
    pub fn builder() -> SchedulePostBuilder {
        <SchedulePostBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SchedulePostBuilder {
    at: Option<String>,
    channel_ids: Option<Vec<String>>,
    time_zone: Option<String>,
}

impl SchedulePostBuilder {
    pub fn at(mut self, value: impl Into<String>) -> Self {
        self.at = Some(value.into());
        self
    }

    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`SchedulePost`].
    /// This method will fail if any of the following fields are not set:
    /// - [`at`](SchedulePostBuilder::at)
    /// - [`channel_ids`](SchedulePostBuilder::channel_ids)
    /// - [`time_zone`](SchedulePostBuilder::time_zone)
    pub fn build(self) -> Result<SchedulePost, BuildError> {
        Ok(SchedulePost {
            at: self.at.ok_or_else(|| BuildError::missing_field("at"))?,
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
        })
    }
}
