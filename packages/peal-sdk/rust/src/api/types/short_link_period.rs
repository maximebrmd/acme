pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ShortLinkPeriod {
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(default)]
    pub to: CalendarDay,
}

impl ShortLinkPeriod {
    pub fn builder() -> ShortLinkPeriodBuilder {
        <ShortLinkPeriodBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ShortLinkPeriodBuilder {
    from: Option<CalendarDay>,
    to: Option<CalendarDay>,
}

impl ShortLinkPeriodBuilder {
    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ShortLinkPeriod`].
    /// This method will fail if any of the following fields are not set:
    /// - [`from`](ShortLinkPeriodBuilder::from)
    /// - [`to`](ShortLinkPeriodBuilder::to)
    pub fn build(self) -> Result<ShortLinkPeriod, BuildError> {
        Ok(ShortLinkPeriod {
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
        })
    }
}
