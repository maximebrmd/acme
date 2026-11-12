pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ShortLinkReport {
    #[serde(default)]
    pub days: Vec<ShortLinkDay>,
    #[serde(default)]
    pub link: ShortLink,
    #[serde(default)]
    pub period: ShortLinkPeriod,
}

impl ShortLinkReport {
    pub fn builder() -> ShortLinkReportBuilder {
        <ShortLinkReportBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ShortLinkReportBuilder {
    days: Option<Vec<ShortLinkDay>>,
    link: Option<ShortLink>,
    period: Option<ShortLinkPeriod>,
}

impl ShortLinkReportBuilder {
    pub fn days(mut self, value: Vec<ShortLinkDay>) -> Self {
        self.days = Some(value);
        self
    }

    pub fn link(mut self, value: ShortLink) -> Self {
        self.link = Some(value);
        self
    }

    pub fn period(mut self, value: ShortLinkPeriod) -> Self {
        self.period = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ShortLinkReport`].
    /// This method will fail if any of the following fields are not set:
    /// - [`days`](ShortLinkReportBuilder::days)
    /// - [`link`](ShortLinkReportBuilder::link)
    /// - [`period`](ShortLinkReportBuilder::period)
    pub fn build(self) -> Result<ShortLinkReport, BuildError> {
        Ok(ShortLinkReport {
            days: self.days.ok_or_else(|| BuildError::missing_field("days"))?,
            link: self.link.ok_or_else(|| BuildError::missing_field("link"))?,
            period: self
                .period
                .ok_or_else(|| BuildError::missing_field("period"))?,
        })
    }
}
