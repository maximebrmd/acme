pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct OpenPartner {
    #[serde(default)]
    pub name: String,
}

impl OpenPartner {
    pub fn builder() -> OpenPartnerBuilder {
        <OpenPartnerBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct OpenPartnerBuilder {
    name: Option<String>,
}

impl OpenPartnerBuilder {
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`OpenPartner`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](OpenPartnerBuilder::name)
    pub fn build(self) -> Result<OpenPartner, BuildError> {
        Ok(OpenPartner {
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
        })
    }
}
