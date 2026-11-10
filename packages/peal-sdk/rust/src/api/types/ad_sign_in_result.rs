pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AdSignInResult {
    #[serde(default)]
    pub accounts: Vec<ReachableAdAccount>,
    pub connection: AdConnection,
}

impl AdSignInResult {
    pub fn builder() -> AdSignInResultBuilder {
        <AdSignInResultBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdSignInResultBuilder {
    accounts: Option<Vec<ReachableAdAccount>>,
    connection: Option<AdConnection>,
}

impl AdSignInResultBuilder {
    pub fn accounts(mut self, value: Vec<ReachableAdAccount>) -> Self {
        self.accounts = Some(value);
        self
    }

    pub fn connection(mut self, value: AdConnection) -> Self {
        self.connection = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdSignInResult`].
    /// This method will fail if any of the following fields are not set:
    /// - [`accounts`](AdSignInResultBuilder::accounts)
    /// - [`connection`](AdSignInResultBuilder::connection)
    pub fn build(self) -> Result<AdSignInResult, BuildError> {
        Ok(AdSignInResult {
            accounts: self
                .accounts
                .ok_or_else(|| BuildError::missing_field("accounts"))?,
            connection: self
                .connection
                .ok_or_else(|| BuildError::missing_field("connection"))?,
        })
    }
}
