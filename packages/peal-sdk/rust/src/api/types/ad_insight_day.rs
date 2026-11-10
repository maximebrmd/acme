pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AdInsightDay {
    #[serde(default)]
    pub day: CalendarDay,
    #[serde(default)]
    pub totals: PaidTotals,
}

impl AdInsightDay {
    pub fn builder() -> AdInsightDayBuilder {
        <AdInsightDayBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdInsightDayBuilder {
    day: Option<CalendarDay>,
    totals: Option<PaidTotals>,
}

impl AdInsightDayBuilder {
    pub fn day(mut self, value: CalendarDay) -> Self {
        self.day = Some(value);
        self
    }

    pub fn totals(mut self, value: PaidTotals) -> Self {
        self.totals = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdInsightDay`].
    /// This method will fail if any of the following fields are not set:
    /// - [`day`](AdInsightDayBuilder::day)
    /// - [`totals`](AdInsightDayBuilder::totals)
    pub fn build(self) -> Result<AdInsightDay, BuildError> {
        Ok(AdInsightDay {
            day: self.day.ok_or_else(|| BuildError::missing_field("day"))?,
            totals: self
                .totals
                .ok_or_else(|| BuildError::missing_field("totals"))?,
        })
    }
}
