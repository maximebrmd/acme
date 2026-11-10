pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PlatformCapabilitiesOptions {
    #[serde(default)]
    pub constraints: Vec<OptionConstraint>,
    #[serde(default)]
    pub fields: Vec<FieldDescription>,
}

impl PlatformCapabilitiesOptions {
    pub fn builder() -> PlatformCapabilitiesOptionsBuilder {
        <PlatformCapabilitiesOptionsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlatformCapabilitiesOptionsBuilder {
    constraints: Option<Vec<OptionConstraint>>,
    fields: Option<Vec<FieldDescription>>,
}

impl PlatformCapabilitiesOptionsBuilder {
    pub fn constraints(mut self, value: Vec<OptionConstraint>) -> Self {
        self.constraints = Some(value);
        self
    }

    pub fn fields(mut self, value: Vec<FieldDescription>) -> Self {
        self.fields = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlatformCapabilitiesOptions`].
    /// This method will fail if any of the following fields are not set:
    /// - [`constraints`](PlatformCapabilitiesOptionsBuilder::constraints)
    /// - [`fields`](PlatformCapabilitiesOptionsBuilder::fields)
    pub fn build(self) -> Result<PlatformCapabilitiesOptions, BuildError> {
        Ok(PlatformCapabilitiesOptions {
            constraints: self
                .constraints
                .ok_or_else(|| BuildError::missing_field("constraints"))?,
            fields: self
                .fields
                .ok_or_else(|| BuildError::missing_field("fields"))?,
        })
    }
}
