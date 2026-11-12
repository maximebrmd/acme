pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BestTimesHour {
    #[serde(default)]
    pub hour: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub median: Option<BestTimesHourMedian>,
    #[serde(default)]
    pub posts: i64,
    pub weekday: Weekday,
}

impl BestTimesHour {
    pub fn builder() -> BestTimesHourBuilder {
        <BestTimesHourBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BestTimesHourBuilder {
    hour: Option<i64>,
    median: Option<BestTimesHourMedian>,
    posts: Option<i64>,
    weekday: Option<Weekday>,
}

impl BestTimesHourBuilder {
    pub fn hour(mut self, value: i64) -> Self {
        self.hour = Some(value);
        self
    }

    pub fn median(mut self, value: BestTimesHourMedian) -> Self {
        self.median = Some(value);
        self
    }

    pub fn posts(mut self, value: i64) -> Self {
        self.posts = Some(value);
        self
    }

    pub fn weekday(mut self, value: Weekday) -> Self {
        self.weekday = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BestTimesHour`].
    /// This method will fail if any of the following fields are not set:
    /// - [`hour`](BestTimesHourBuilder::hour)
    /// - [`posts`](BestTimesHourBuilder::posts)
    /// - [`weekday`](BestTimesHourBuilder::weekday)
    pub fn build(self) -> Result<BestTimesHour, BuildError> {
        Ok(BestTimesHour {
            hour: self.hour.ok_or_else(|| BuildError::missing_field("hour"))?,
            median: self.median,
            posts: self
                .posts
                .ok_or_else(|| BuildError::missing_field("posts"))?,
            weekday: self
                .weekday
                .ok_or_else(|| BuildError::missing_field("weekday"))?,
        })
    }
}
