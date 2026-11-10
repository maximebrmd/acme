pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AdInsightReport {
    pub account: AdAccount,
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(default)]
    pub rows: Vec<AdInsightDay>,
    #[serde(default)]
    pub to: CalendarDay,
}

impl AdInsightReport {
    pub fn builder() -> AdInsightReportBuilder {
        <AdInsightReportBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdInsightReportBuilder {
    account: Option<AdAccount>,
    from: Option<CalendarDay>,
    rows: Option<Vec<AdInsightDay>>,
    to: Option<CalendarDay>,
}

impl AdInsightReportBuilder {
    pub fn account(mut self, value: AdAccount) -> Self {
        self.account = Some(value);
        self
    }

    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn rows(mut self, value: Vec<AdInsightDay>) -> Self {
        self.rows = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdInsightReport`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account`](AdInsightReportBuilder::account)
    /// - [`from`](AdInsightReportBuilder::from)
    /// - [`rows`](AdInsightReportBuilder::rows)
    /// - [`to`](AdInsightReportBuilder::to)
    pub fn build(self) -> Result<AdInsightReport, BuildError> {
        Ok(AdInsightReport {
            account: self
                .account
                .ok_or_else(|| BuildError::missing_field("account"))?,
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            rows: self.rows.ok_or_else(|| BuildError::missing_field("rows"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
        })
    }
}
