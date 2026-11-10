pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PlanLimitReachedEncoded {
    #[serde(rename = "_tag")]
    pub tag: PlanLimitReachedEncodedTag,
    #[serde(default)]
    pub allowed: i64,
    #[serde(rename = "billingUrl")]
    #[serde(default)]
    pub billing_url: String,
    pub limit: PlanLimit,
    pub plan: Plan,
    #[serde(rename = "planWithRoom")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_with_room: Option<PaidPlan>,
    #[serde(default)]
    pub used: i64,
}

impl PlanLimitReachedEncoded {
    pub fn builder() -> PlanLimitReachedEncodedBuilder {
        <PlanLimitReachedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlanLimitReachedEncodedBuilder {
    tag: Option<PlanLimitReachedEncodedTag>,
    allowed: Option<i64>,
    billing_url: Option<String>,
    limit: Option<PlanLimit>,
    plan: Option<Plan>,
    plan_with_room: Option<PaidPlan>,
    used: Option<i64>,
}

impl PlanLimitReachedEncodedBuilder {
    pub fn tag(mut self, value: PlanLimitReachedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn allowed(mut self, value: i64) -> Self {
        self.allowed = Some(value);
        self
    }

    pub fn billing_url(mut self, value: impl Into<String>) -> Self {
        self.billing_url = Some(value.into());
        self
    }

    pub fn limit(mut self, value: PlanLimit) -> Self {
        self.limit = Some(value);
        self
    }

    pub fn plan(mut self, value: Plan) -> Self {
        self.plan = Some(value);
        self
    }

    pub fn plan_with_room(mut self, value: PaidPlan) -> Self {
        self.plan_with_room = Some(value);
        self
    }

    pub fn used(mut self, value: i64) -> Self {
        self.used = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlanLimitReachedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](PlanLimitReachedEncodedBuilder::tag)
    /// - [`allowed`](PlanLimitReachedEncodedBuilder::allowed)
    /// - [`billing_url`](PlanLimitReachedEncodedBuilder::billing_url)
    /// - [`limit`](PlanLimitReachedEncodedBuilder::limit)
    /// - [`plan`](PlanLimitReachedEncodedBuilder::plan)
    /// - [`used`](PlanLimitReachedEncodedBuilder::used)
    pub fn build(self) -> Result<PlanLimitReachedEncoded, BuildError> {
        Ok(PlanLimitReachedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            allowed: self
                .allowed
                .ok_or_else(|| BuildError::missing_field("allowed"))?,
            billing_url: self
                .billing_url
                .ok_or_else(|| BuildError::missing_field("billing_url"))?,
            limit: self
                .limit
                .ok_or_else(|| BuildError::missing_field("limit"))?,
            plan: self.plan.ok_or_else(|| BuildError::missing_field("plan"))?,
            plan_with_room: self.plan_with_room,
            used: self.used.ok_or_else(|| BuildError::missing_field("used"))?,
        })
    }
}
