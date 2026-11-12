pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerHealthAccount {
    #[serde(rename = "overPlan")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_plan: Option<bool>,
}

impl PartnerHealthAccount {
    pub fn builder() -> PartnerHealthAccountBuilder {
        <PartnerHealthAccountBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerHealthAccountBuilder {
    over_plan: Option<bool>,
}

impl PartnerHealthAccountBuilder {
    pub fn over_plan(mut self, value: bool) -> Self {
        self.over_plan = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerHealthAccount`].
    pub fn build(self) -> Result<PartnerHealthAccount, BuildError> {
        Ok(PartnerHealthAccount {
            over_plan: self.over_plan,
        })
    }
}
