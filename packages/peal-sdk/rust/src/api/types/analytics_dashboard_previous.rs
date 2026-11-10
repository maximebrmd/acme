pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AnalyticsDashboardPrevious {
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(default)]
    pub to: CalendarDay,
}

impl AnalyticsDashboardPrevious {
    pub fn builder() -> AnalyticsDashboardPreviousBuilder {
        <AnalyticsDashboardPreviousBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AnalyticsDashboardPreviousBuilder {
    from: Option<CalendarDay>,
    to: Option<CalendarDay>,
}

impl AnalyticsDashboardPreviousBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AnalyticsDashboardPrevious`].
    /// This method will fail if any of the following fields are not set:
    /// - [`from`](AnalyticsDashboardPreviousBuilder::from)
    /// - [`to`](AnalyticsDashboardPreviousBuilder::to)
    pub fn build(self) -> Result<AnalyticsDashboardPrevious, BuildError> {
        Ok(AnalyticsDashboardPrevious {
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
        })
    }
}
