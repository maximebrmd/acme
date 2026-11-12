pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerUsageReport {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub allowances: Option<PlanAllowances>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current: Option<PartnerHoldings>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days: Option<Vec<PartnerUsageReportDay>>,
    #[serde(default)]
    pub period: UsagePeriod,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<Plan>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub totals: Option<UsageTotals>,
    #[serde(default)]
    pub workspaces: TenantUsagePage,
}

impl PartnerUsageReport {
    pub fn builder() -> PartnerUsageReportBuilder {
        <PartnerUsageReportBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerUsageReportBuilder {
    allowances: Option<PlanAllowances>,
    current: Option<PartnerHoldings>,
    days: Option<Vec<PartnerUsageReportDay>>,
    period: Option<UsagePeriod>,
    plan: Option<Plan>,
    totals: Option<UsageTotals>,
    workspaces: Option<TenantUsagePage>,
}

impl PartnerUsageReportBuilder {
    pub fn allowances(mut self, value: PlanAllowances) -> Self {
        self.allowances = Some(value);
        self
    }

    pub fn current(mut self, value: PartnerHoldings) -> Self {
        self.current = Some(value);
        self
    }

    pub fn days(mut self, value: Vec<PartnerUsageReportDay>) -> Self {
        self.days = Some(value);
        self
    }

    pub fn period(mut self, value: UsagePeriod) -> Self {
        self.period = Some(value);
        self
    }

    pub fn plan(mut self, value: Plan) -> Self {
        self.plan = Some(value);
        self
    }

    pub fn totals(mut self, value: UsageTotals) -> Self {
        self.totals = Some(value);
        self
    }

    pub fn workspaces(mut self, value: TenantUsagePage) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerUsageReport`].
    /// This method will fail if any of the following fields are not set:
    /// - [`period`](PartnerUsageReportBuilder::period)
    /// - [`workspaces`](PartnerUsageReportBuilder::workspaces)
    pub fn build(self) -> Result<PartnerUsageReport, BuildError> {
        Ok(PartnerUsageReport {
            allowances: self.allowances,
            current: self.current,
            days: self.days,
            period: self
                .period
                .ok_or_else(|| BuildError::missing_field("period"))?,
            plan: self.plan,
            totals: self.totals,
            workspaces: self
                .workspaces
                .ok_or_else(|| BuildError::missing_field("workspaces"))?,
        })
    }
}
