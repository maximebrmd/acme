pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct EngagementDay {
    #[serde(default)]
    pub date: CalendarDay,
    #[serde(default)]
    pub likes: i64,
    #[serde(default)]
    pub quotes: i64,
    #[serde(default)]
    pub replies: i64,
    #[serde(default)]
    pub reposts: i64,
}

impl EngagementDay {
    pub fn builder() -> EngagementDayBuilder {
        <EngagementDayBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct EngagementDayBuilder {
    date: Option<CalendarDay>,
    likes: Option<i64>,
    quotes: Option<i64>,
    replies: Option<i64>,
    reposts: Option<i64>,
}

impl EngagementDayBuilder {
    pub fn date(mut self, value: CalendarDay) -> Self {
        self.date = Some(value);
        self
    }

    pub fn likes(mut self, value: i64) -> Self {
        self.likes = Some(value);
        self
    }

    pub fn quotes(mut self, value: i64) -> Self {
        self.quotes = Some(value);
        self
    }

    pub fn replies(mut self, value: i64) -> Self {
        self.replies = Some(value);
        self
    }

    pub fn reposts(mut self, value: i64) -> Self {
        self.reposts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`EngagementDay`].
    /// This method will fail if any of the following fields are not set:
    /// - [`date`](EngagementDayBuilder::date)
    /// - [`likes`](EngagementDayBuilder::likes)
    /// - [`quotes`](EngagementDayBuilder::quotes)
    /// - [`replies`](EngagementDayBuilder::replies)
    /// - [`reposts`](EngagementDayBuilder::reposts)
    pub fn build(self) -> Result<EngagementDay, BuildError> {
        Ok(EngagementDay {
            date: self.date.ok_or_else(|| BuildError::missing_field("date"))?,
            likes: self
                .likes
                .ok_or_else(|| BuildError::missing_field("likes"))?,
            quotes: self
                .quotes
                .ok_or_else(|| BuildError::missing_field("quotes"))?,
            replies: self
                .replies
                .ok_or_else(|| BuildError::missing_field("replies"))?,
            reposts: self
                .reposts
                .ok_or_else(|| BuildError::missing_field("reposts"))?,
        })
    }
}
