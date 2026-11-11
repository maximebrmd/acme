pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UsagePeriod {
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(default)]
    pub to: CalendarDay,
}

impl UsagePeriod {
    pub fn builder() -> UsagePeriodBuilder {
        <UsagePeriodBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UsagePeriodBuilder {
    from: Option<CalendarDay>,
    to: Option<CalendarDay>,
}

impl UsagePeriodBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UsagePeriod`].
    /// This method will fail if any of the following fields are not set:
    /// - [`from`](UsagePeriodBuilder::from)
    /// - [`to`](UsagePeriodBuilder::to)
    pub fn build(self) -> Result<UsagePeriod, BuildError> {
        Ok(UsagePeriod {
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
        })
    }
}
