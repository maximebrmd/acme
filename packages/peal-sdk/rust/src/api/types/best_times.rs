pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BestTimes {
    #[serde(default)]
    pub best: Vec<BestTimesHour>,
    #[serde(default)]
    pub buckets: Vec<BestTimesHour>,
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(default)]
    pub counted: bool,
    #[serde(default)]
    pub days: i64,
    #[serde(default)]
    pub enough: bool,
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(rename = "minimumPosts")]
    #[serde(default)]
    pub minimum_posts: i64,
    #[serde(rename = "minimumPostsPerHour")]
    #[serde(default)]
    pub minimum_posts_per_hour: i64,
    pub platform: Platform,
    #[serde(default)]
    pub posts: i64,
    #[serde(default)]
    pub recent: i64,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(default)]
    pub to: CalendarDay,
}

impl BestTimes {
    pub fn builder() -> BestTimesBuilder {
        <BestTimesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BestTimesBuilder {
    best: Option<Vec<BestTimesHour>>,
    buckets: Option<Vec<BestTimesHour>>,
    channel_id: Option<String>,
    counted: Option<bool>,
    days: Option<i64>,
    enough: Option<bool>,
    from: Option<CalendarDay>,
    minimum_posts: Option<i64>,
    minimum_posts_per_hour: Option<i64>,
    platform: Option<Platform>,
    posts: Option<i64>,
    recent: Option<i64>,
    time_zone: Option<String>,
    to: Option<CalendarDay>,
}

impl BestTimesBuilder {
    pub fn best(mut self, value: Vec<BestTimesHour>) -> Self {
        self.best = Some(value);
        self
    }

    pub fn buckets(mut self, value: Vec<BestTimesHour>) -> Self {
        self.buckets = Some(value);
        self
    }

    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn counted(mut self, value: bool) -> Self {
        self.counted = Some(value);
        self
    }

    pub fn days(mut self, value: i64) -> Self {
        self.days = Some(value);
        self
    }

    pub fn enough(mut self, value: bool) -> Self {
        self.enough = Some(value);
        self
    }

    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn minimum_posts(mut self, value: i64) -> Self {
        self.minimum_posts = Some(value);
        self
    }

    pub fn minimum_posts_per_hour(mut self, value: i64) -> Self {
        self.minimum_posts_per_hour = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    pub fn posts(mut self, value: i64) -> Self {
        self.posts = Some(value);
        self
    }

    pub fn recent(mut self, value: i64) -> Self {
        self.recent = Some(value);
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

    /// Consumes the builder and constructs a [`BestTimes`].
    /// This method will fail if any of the following fields are not set:
    /// - [`best`](BestTimesBuilder::best)
    /// - [`buckets`](BestTimesBuilder::buckets)
    /// - [`channel_id`](BestTimesBuilder::channel_id)
    /// - [`counted`](BestTimesBuilder::counted)
    /// - [`days`](BestTimesBuilder::days)
    /// - [`enough`](BestTimesBuilder::enough)
    /// - [`from`](BestTimesBuilder::from)
    /// - [`minimum_posts`](BestTimesBuilder::minimum_posts)
    /// - [`minimum_posts_per_hour`](BestTimesBuilder::minimum_posts_per_hour)
    /// - [`platform`](BestTimesBuilder::platform)
    /// - [`posts`](BestTimesBuilder::posts)
    /// - [`recent`](BestTimesBuilder::recent)
    /// - [`time_zone`](BestTimesBuilder::time_zone)
    /// - [`to`](BestTimesBuilder::to)
    pub fn build(self) -> Result<BestTimes, BuildError> {
        Ok(BestTimes {
            best: self.best.ok_or_else(|| BuildError::missing_field("best"))?,
            buckets: self
                .buckets
                .ok_or_else(|| BuildError::missing_field("buckets"))?,
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            counted: self
                .counted
                .ok_or_else(|| BuildError::missing_field("counted"))?,
            days: self.days.ok_or_else(|| BuildError::missing_field("days"))?,
            enough: self
                .enough
                .ok_or_else(|| BuildError::missing_field("enough"))?,
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            minimum_posts: self
                .minimum_posts
                .ok_or_else(|| BuildError::missing_field("minimum_posts"))?,
            minimum_posts_per_hour: self
                .minimum_posts_per_hour
                .ok_or_else(|| BuildError::missing_field("minimum_posts_per_hour"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
            posts: self
                .posts
                .ok_or_else(|| BuildError::missing_field("posts"))?,
            recent: self
                .recent
                .ok_or_else(|| BuildError::missing_field("recent"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
        })
    }
}
