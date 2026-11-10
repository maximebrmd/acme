pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AdReport {
    pub account: AdAccount,
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(default)]
    pub rows: Vec<Ad>,
    #[serde(default)]
    pub to: CalendarDay,
}

impl AdReport {
    pub fn builder() -> AdReportBuilder {
        <AdReportBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdReportBuilder {
    account: Option<AdAccount>,
    from: Option<CalendarDay>,
    rows: Option<Vec<Ad>>,
    to: Option<CalendarDay>,
}

impl AdReportBuilder {
    pub fn account(mut self, value: AdAccount) -> Self {
        self.account = Some(value);
        self
    }

    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn rows(mut self, value: Vec<Ad>) -> Self {
        self.rows = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdReport`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account`](AdReportBuilder::account)
    /// - [`from`](AdReportBuilder::from)
    /// - [`rows`](AdReportBuilder::rows)
    /// - [`to`](AdReportBuilder::to)
    pub fn build(self) -> Result<AdReport, BuildError> {
        Ok(AdReport {
            account: self
                .account
                .ok_or_else(|| BuildError::missing_field("account"))?,
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            rows: self.rows.ok_or_else(|| BuildError::missing_field("rows"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
        })
    }
}
