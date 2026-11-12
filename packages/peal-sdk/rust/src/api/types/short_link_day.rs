pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ShortLinkDay {
    #[serde(default)]
    pub clicks: i64,
    #[serde(default)]
    pub day: CalendarDay,
}

impl ShortLinkDay {
    pub fn builder() -> ShortLinkDayBuilder {
        <ShortLinkDayBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ShortLinkDayBuilder {
    clicks: Option<i64>,
    day: Option<CalendarDay>,
}

impl ShortLinkDayBuilder {
    pub fn clicks(mut self, value: i64) -> Self {
        self.clicks = Some(value);
        self
    }

    pub fn day(mut self, value: CalendarDay) -> Self {
        self.day = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ShortLinkDay`].
    /// This method will fail if any of the following fields are not set:
    /// - [`clicks`](ShortLinkDayBuilder::clicks)
    /// - [`day`](ShortLinkDayBuilder::day)
    pub fn build(self) -> Result<ShortLinkDay, BuildError> {
        Ok(ShortLinkDay {
            clicks: self
                .clicks
                .ok_or_else(|| BuildError::missing_field("clicks"))?,
            day: self.day.ok_or_else(|| BuildError::missing_field("day"))?,
        })
    }
}
