pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AdAccountsToConnect {
    #[serde(rename = "externalIds")]
    #[serde(default)]
    pub external_ids: Vec<String>,
}

impl AdAccountsToConnect {
    pub fn builder() -> AdAccountsToConnectBuilder {
        <AdAccountsToConnectBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdAccountsToConnectBuilder {
    external_ids: Option<Vec<String>>,
}

impl AdAccountsToConnectBuilder {
    pub fn external_ids(mut self, value: Vec<String>) -> Self {
        self.external_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdAccountsToConnect`].
    /// This method will fail if any of the following fields are not set:
    /// - [`external_ids`](AdAccountsToConnectBuilder::external_ids)
    pub fn build(self) -> Result<AdAccountsToConnect, BuildError> {
        Ok(AdAccountsToConnect {
            external_ids: self
                .external_ids
                .ok_or_else(|| BuildError::missing_field("external_ids"))?,
        })
    }
}
