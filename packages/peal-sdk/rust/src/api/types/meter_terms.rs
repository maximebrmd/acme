pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MeterTerms {
    #[serde(default)]
    pub allowance: i64,
    #[serde(rename = "allowanceWithout")]
    #[serde(default)]
    pub allowance_without: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ceiling: Option<i64>,
}

impl MeterTerms {
    pub fn builder() -> MeterTermsBuilder {
        <MeterTermsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MeterTermsBuilder {
    allowance: Option<i64>,
    allowance_without: Option<i64>,
    ceiling: Option<i64>,
}

impl MeterTermsBuilder {
    pub fn allowance(mut self, value: i64) -> Self {
        self.allowance = Some(value);
        self
    }

    pub fn allowance_without(mut self, value: i64) -> Self {
        self.allowance_without = Some(value);
        self
    }

    pub fn ceiling(mut self, value: i64) -> Self {
        self.ceiling = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MeterTerms`].
    /// This method will fail if any of the following fields are not set:
    /// - [`allowance`](MeterTermsBuilder::allowance)
    /// - [`allowance_without`](MeterTermsBuilder::allowance_without)
    pub fn build(self) -> Result<MeterTerms, BuildError> {
        Ok(MeterTerms {
            allowance: self
                .allowance
                .ok_or_else(|| BuildError::missing_field("allowance"))?,
            allowance_without: self
                .allowance_without
                .ok_or_else(|| BuildError::missing_field("allowance_without"))?,
            ceiling: self.ceiling,
        })
    }
}
