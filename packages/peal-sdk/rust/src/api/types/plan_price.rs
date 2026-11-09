pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PlanPrice {
    #[serde(default)]
    pub month: i64,
    #[serde(default)]
    pub year: i64,
}

impl PlanPrice {
    pub fn builder() -> PlanPriceBuilder {
        <PlanPriceBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlanPriceBuilder {
    month: Option<i64>,
    year: Option<i64>,
}

impl PlanPriceBuilder {
    pub fn month(mut self, value: i64) -> Self {
        self.month = Some(value);
        self
    }

    pub fn year(mut self, value: i64) -> Self {
        self.year = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlanPrice`].
    /// This method will fail if any of the following fields are not set:
    /// - [`month`](PlanPriceBuilder::month)
    /// - [`year`](PlanPriceBuilder::year)
    pub fn build(self) -> Result<PlanPrice, BuildError> {
        Ok(PlanPrice {
            month: self
                .month
                .ok_or_else(|| BuildError::missing_field("month"))?,
            year: self.year.ok_or_else(|| BuildError::missing_field("year"))?,
        })
    }
}
