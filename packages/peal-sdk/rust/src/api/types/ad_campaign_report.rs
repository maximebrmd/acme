pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AdCampaignReport {
    pub account: AdAccount,
    #[serde(default)]
    pub from: CalendarDay,
    #[serde(default)]
    pub rows: Vec<AdCampaign>,
    #[serde(default)]
    pub to: CalendarDay,
}

impl AdCampaignReport {
    pub fn builder() -> AdCampaignReportBuilder {
        <AdCampaignReportBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdCampaignReportBuilder {
    account: Option<AdAccount>,
    from: Option<CalendarDay>,
    rows: Option<Vec<AdCampaign>>,
    to: Option<CalendarDay>,
}

impl AdCampaignReportBuilder {
    pub fn account(mut self, value: AdAccount) -> Self {
        self.account = Some(value);
        self
    }

    pub fn from(mut self, value: CalendarDay) -> Self {
        self.from = Some(value);
        self
    }

    pub fn rows(mut self, value: Vec<AdCampaign>) -> Self {
        self.rows = Some(value);
        self
    }

    pub fn to(mut self, value: CalendarDay) -> Self {
        self.to = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdCampaignReport`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account`](AdCampaignReportBuilder::account)
    /// - [`from`](AdCampaignReportBuilder::from)
    /// - [`rows`](AdCampaignReportBuilder::rows)
    /// - [`to`](AdCampaignReportBuilder::to)
    pub fn build(self) -> Result<AdCampaignReport, BuildError> {
        Ok(AdCampaignReport {
            account: self
                .account
                .ok_or_else(|| BuildError::missing_field("account"))?,
            from: self.from.ok_or_else(|| BuildError::missing_field("from"))?,
            rows: self.rows.ok_or_else(|| BuildError::missing_field("rows"))?,
            to: self.to.ok_or_else(|| BuildError::missing_field("to"))?,
        })
    }
}
