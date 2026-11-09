pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PlanOffer {
    #[serde(default)]
    pub allowances: PlanAllowances,
    pub plan: Plan,
}

impl PlanOffer {
    pub fn builder() -> PlanOfferBuilder {
        <PlanOfferBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlanOfferBuilder {
    allowances: Option<PlanAllowances>,
    plan: Option<Plan>,
}

impl PlanOfferBuilder {
    pub fn allowances(mut self, value: PlanAllowances) -> Self {
        self.allowances = Some(value);
        self
    }

    pub fn plan(mut self, value: Plan) -> Self {
        self.plan = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlanOffer`].
    /// This method will fail if any of the following fields are not set:
    /// - [`allowances`](PlanOfferBuilder::allowances)
    /// - [`plan`](PlanOfferBuilder::plan)
    pub fn build(self) -> Result<PlanOffer, BuildError> {
        Ok(PlanOffer {
            allowances: self
                .allowances
                .ok_or_else(|| BuildError::missing_field("allowances"))?,
            plan: self.plan.ok_or_else(|| BuildError::missing_field("plan"))?,
        })
    }
}
