pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct RecyclingVariantsInvalidEncodedVariantsItem {
    #[serde(default)]
    pub variant: i64,
    #[serde(default)]
    pub violations: Vec<ContentViolation>,
}

impl RecyclingVariantsInvalidEncodedVariantsItem {
    pub fn builder() -> RecyclingVariantsInvalidEncodedVariantsItemBuilder {
        <RecyclingVariantsInvalidEncodedVariantsItemBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingVariantsInvalidEncodedVariantsItemBuilder {
    variant: Option<i64>,
    violations: Option<Vec<ContentViolation>>,
}

impl RecyclingVariantsInvalidEncodedVariantsItemBuilder {
    pub fn variant(mut self, value: i64) -> Self {
        self.variant = Some(value);
        self
    }

    pub fn violations(mut self, value: Vec<ContentViolation>) -> Self {
        self.violations = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RecyclingVariantsInvalidEncodedVariantsItem`].
    /// This method will fail if any of the following fields are not set:
    /// - [`variant`](RecyclingVariantsInvalidEncodedVariantsItemBuilder::variant)
    /// - [`violations`](RecyclingVariantsInvalidEncodedVariantsItemBuilder::violations)
    pub fn build(self) -> Result<RecyclingVariantsInvalidEncodedVariantsItem, BuildError> {
        Ok(RecyclingVariantsInvalidEncodedVariantsItem {
            variant: self
                .variant
                .ok_or_else(|| BuildError::missing_field("variant"))?,
            violations: self
                .violations
                .ok_or_else(|| BuildError::missing_field("violations"))?,
        })
    }
}
