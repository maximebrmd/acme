pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerChange {
    #[serde(rename = "logoUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(rename = "returnOrigins")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub return_origins: Option<Vec<String>>,
}

impl PartnerChange {
    pub fn builder() -> PartnerChangeBuilder {
        <PartnerChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerChangeBuilder {
    logo_url: Option<String>,
    name: Option<String>,
    return_origins: Option<Vec<String>>,
}

impl PartnerChangeBuilder {
    pub fn logo_url(mut self, value: impl Into<String>) -> Self {
        self.logo_url = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn return_origins(mut self, value: Vec<String>) -> Self {
        self.return_origins = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerChange`].
    pub fn build(self) -> Result<PartnerChange, BuildError> {
        Ok(PartnerChange {
            logo_url: self.logo_url,
            name: self.name,
            return_origins: self.return_origins,
        })
    }
}
