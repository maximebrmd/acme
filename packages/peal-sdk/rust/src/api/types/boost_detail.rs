pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BoostDetail {
    pub boost: Boost,
    #[serde(default)]
    pub steps: Vec<BoostStep>,
}

impl BoostDetail {
    pub fn builder() -> BoostDetailBuilder {
        <BoostDetailBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BoostDetailBuilder {
    boost: Option<Boost>,
    steps: Option<Vec<BoostStep>>,
}

impl BoostDetailBuilder {
    pub fn boost(mut self, value: Boost) -> Self {
        self.boost = Some(value);
        self
    }

    pub fn steps(mut self, value: Vec<BoostStep>) -> Self {
        self.steps = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BoostDetail`].
    /// This method will fail if any of the following fields are not set:
    /// - [`boost`](BoostDetailBuilder::boost)
    /// - [`steps`](BoostDetailBuilder::steps)
    pub fn build(self) -> Result<BoostDetail, BuildError> {
        Ok(BoostDetail {
            boost: self
                .boost
                .ok_or_else(|| BuildError::missing_field("boost"))?,
            steps: self
                .steps
                .ok_or_else(|| BuildError::missing_field("steps"))?,
        })
    }
}
