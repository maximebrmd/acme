pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WorkspaceUsageReport {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub allowances: Option<PlanAllowances>,
    #[serde(default)]
    pub current: Usage,
    #[serde(default)]
    pub days: Vec<UsageDay>,
    #[serde(default)]
    pub period: UsagePeriod,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<Plan>,
    #[serde(rename = "sharedWith")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shared_with: Option<UsageSharing>,
    #[serde(default)]
    pub totals: UsageTotals,
}

impl WorkspaceUsageReport {
    pub fn builder() -> WorkspaceUsageReportBuilder {
        <WorkspaceUsageReportBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WorkspaceUsageReportBuilder {
    allowances: Option<PlanAllowances>,
    current: Option<Usage>,
    days: Option<Vec<UsageDay>>,
    period: Option<UsagePeriod>,
    plan: Option<Plan>,
    shared_with: Option<UsageSharing>,
    totals: Option<UsageTotals>,
}

impl WorkspaceUsageReportBuilder {
    pub fn allowances(mut self, value: PlanAllowances) -> Self {
        self.allowances = Some(value);
        self
    }

    pub fn current(mut self, value: Usage) -> Self {
        self.current = Some(value);
        self
    }

    pub fn days(mut self, value: Vec<UsageDay>) -> Self {
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

    pub fn shared_with(mut self, value: UsageSharing) -> Self {
        self.shared_with = Some(value);
        self
    }

    pub fn totals(mut self, value: UsageTotals) -> Self {
        self.totals = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`WorkspaceUsageReport`].
    /// This method will fail if any of the following fields are not set:
    /// - [`current`](WorkspaceUsageReportBuilder::current)
    /// - [`days`](WorkspaceUsageReportBuilder::days)
    /// - [`period`](WorkspaceUsageReportBuilder::period)
    /// - [`totals`](WorkspaceUsageReportBuilder::totals)
    pub fn build(self) -> Result<WorkspaceUsageReport, BuildError> {
        Ok(WorkspaceUsageReport {
            allowances: self.allowances,
            current: self
                .current
                .ok_or_else(|| BuildError::missing_field("current"))?,
            days: self.days.ok_or_else(|| BuildError::missing_field("days"))?,
            period: self
                .period
                .ok_or_else(|| BuildError::missing_field("period"))?,
            plan: self.plan,
            shared_with: self.shared_with,
            totals: self
                .totals
                .ok_or_else(|| BuildError::missing_field("totals"))?,
        })
    }
}
