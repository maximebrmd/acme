pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerUsageReportDay {
    #[serde(rename = "byPlatform")]
    #[serde(default)]
    pub by_platform: Vec<PlatformPosts>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channels: Option<i64>,
    #[serde(default)]
    pub day: CalendarDay,
    #[serde(rename = "publishedPosts")]
    #[serde(default)]
    pub published_posts: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspaces: Option<i64>,
}

impl PartnerUsageReportDay {
    pub fn builder() -> PartnerUsageReportDayBuilder {
        <PartnerUsageReportDayBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerUsageReportDayBuilder {
    by_platform: Option<Vec<PlatformPosts>>,
    channels: Option<i64>,
    day: Option<CalendarDay>,
    published_posts: Option<i64>,
    workspaces: Option<i64>,
}

impl PartnerUsageReportDayBuilder {
    pub fn by_platform(mut self, value: Vec<PlatformPosts>) -> Self {
        self.by_platform = Some(value);
        self
    }

    pub fn channels(mut self, value: i64) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn day(mut self, value: CalendarDay) -> Self {
        self.day = Some(value);
        self
    }

    pub fn published_posts(mut self, value: i64) -> Self {
        self.published_posts = Some(value);
        self
    }

    pub fn workspaces(mut self, value: i64) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerUsageReportDay`].
    /// This method will fail if any of the following fields are not set:
    /// - [`by_platform`](PartnerUsageReportDayBuilder::by_platform)
    /// - [`day`](PartnerUsageReportDayBuilder::day)
    /// - [`published_posts`](PartnerUsageReportDayBuilder::published_posts)
    pub fn build(self) -> Result<PartnerUsageReportDay, BuildError> {
        Ok(PartnerUsageReportDay {
            by_platform: self
                .by_platform
                .ok_or_else(|| BuildError::missing_field("by_platform"))?,
            channels: self.channels,
            day: self.day.ok_or_else(|| BuildError::missing_field("day"))?,
            published_posts: self
                .published_posts
                .ok_or_else(|| BuildError::missing_field("published_posts"))?,
            workspaces: self.workspaces,
        })
    }
}
