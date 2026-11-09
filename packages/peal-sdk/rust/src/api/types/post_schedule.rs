pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostSchedule {
    #[serde(default)]
    pub at: String,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
}

impl PostSchedule {
    pub fn builder() -> PostScheduleBuilder {
        <PostScheduleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostScheduleBuilder {
    at: Option<String>,
    time_zone: Option<String>,
}

impl PostScheduleBuilder {
    pub fn at(mut self, value: impl Into<String>) -> Self {
        self.at = Some(value.into());
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PostSchedule`].
    /// This method will fail if any of the following fields are not set:
    /// - [`at`](PostScheduleBuilder::at)
    /// - [`time_zone`](PostScheduleBuilder::time_zone)
    pub fn build(self) -> Result<PostSchedule, BuildError> {
        Ok(PostSchedule {
            at: self.at.ok_or_else(|| BuildError::missing_field("at"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
        })
    }
}
