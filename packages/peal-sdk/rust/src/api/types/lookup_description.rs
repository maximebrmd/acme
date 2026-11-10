pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LookupDescription {
    #[serde(default)]
    pub fills: Vec<String>,
    #[serde(default)]
    pub input: Vec<FieldDescription>,
    pub name: LookupName,
    #[serde(default)]
    pub paged: bool,
    pub platform: Platform,
}

impl LookupDescription {
    pub fn builder() -> LookupDescriptionBuilder {
        <LookupDescriptionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LookupDescriptionBuilder {
    fills: Option<Vec<String>>,
    input: Option<Vec<FieldDescription>>,
    name: Option<LookupName>,
    paged: Option<bool>,
    platform: Option<Platform>,
}

impl LookupDescriptionBuilder {
    pub fn fills(mut self, value: Vec<String>) -> Self {
        self.fills = Some(value);
        self
    }

    pub fn input(mut self, value: Vec<FieldDescription>) -> Self {
        self.input = Some(value);
        self
    }

    pub fn name(mut self, value: LookupName) -> Self {
        self.name = Some(value);
        self
    }

    pub fn paged(mut self, value: bool) -> Self {
        self.paged = Some(value);
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`LookupDescription`].
    /// This method will fail if any of the following fields are not set:
    /// - [`fills`](LookupDescriptionBuilder::fills)
    /// - [`input`](LookupDescriptionBuilder::input)
    /// - [`name`](LookupDescriptionBuilder::name)
    /// - [`paged`](LookupDescriptionBuilder::paged)
    /// - [`platform`](LookupDescriptionBuilder::platform)
    pub fn build(self) -> Result<LookupDescription, BuildError> {
        Ok(LookupDescription {
            fills: self
                .fills
                .ok_or_else(|| BuildError::missing_field("fills"))?,
            input: self
                .input
                .ok_or_else(|| BuildError::missing_field("input"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            paged: self
                .paged
                .ok_or_else(|| BuildError::missing_field("paged"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
        })
    }
}
