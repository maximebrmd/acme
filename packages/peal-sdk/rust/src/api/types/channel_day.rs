pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChannelDay {
    #[serde(default)]
    pub date: CalendarDay,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub followers: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub following: Option<i64>,
    #[serde(default)]
    pub likes: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub posts: Option<i64>,
    #[serde(default)]
    pub quotes: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reach: Option<i64>,
    #[serde(default)]
    pub replies: i64,
    #[serde(default)]
    pub reposts: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub views: Option<i64>,
}

impl ChannelDay {
    pub fn builder() -> ChannelDayBuilder {
        <ChannelDayBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelDayBuilder {
    date: Option<CalendarDay>,
    followers: Option<i64>,
    following: Option<i64>,
    likes: Option<i64>,
    posts: Option<i64>,
    quotes: Option<i64>,
    reach: Option<i64>,
    replies: Option<i64>,
    reposts: Option<i64>,
    views: Option<i64>,
}

impl ChannelDayBuilder {
    pub fn date(mut self, value: CalendarDay) -> Self {
        self.date = Some(value);
        self
    }

    pub fn followers(mut self, value: i64) -> Self {
        self.followers = Some(value);
        self
    }

    pub fn following(mut self, value: i64) -> Self {
        self.following = Some(value);
        self
    }

    pub fn likes(mut self, value: i64) -> Self {
        self.likes = Some(value);
        self
    }

    pub fn posts(mut self, value: i64) -> Self {
        self.posts = Some(value);
        self
    }

    pub fn quotes(mut self, value: i64) -> Self {
        self.quotes = Some(value);
        self
    }

    pub fn reach(mut self, value: i64) -> Self {
        self.reach = Some(value);
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

    pub fn views(mut self, value: i64) -> Self {
        self.views = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelDay`].
    /// This method will fail if any of the following fields are not set:
    /// - [`date`](ChannelDayBuilder::date)
    /// - [`likes`](ChannelDayBuilder::likes)
    /// - [`quotes`](ChannelDayBuilder::quotes)
    /// - [`replies`](ChannelDayBuilder::replies)
    /// - [`reposts`](ChannelDayBuilder::reposts)
    pub fn build(self) -> Result<ChannelDay, BuildError> {
        Ok(ChannelDay {
            date: self.date.ok_or_else(|| BuildError::missing_field("date"))?,
            followers: self.followers,
            following: self.following,
            likes: self
                .likes
                .ok_or_else(|| BuildError::missing_field("likes"))?,
            posts: self.posts,
            quotes: self
                .quotes
                .ok_or_else(|| BuildError::missing_field("quotes"))?,
            reach: self.reach,
            replies: self
                .replies
                .ok_or_else(|| BuildError::missing_field("replies"))?,
            reposts: self
                .reposts
                .ok_or_else(|| BuildError::missing_field("reposts"))?,
            views: self.views,
        })
    }
}
