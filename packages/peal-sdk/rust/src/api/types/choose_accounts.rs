pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChooseAccounts {
    #[serde(rename = "accountIds")]
    #[serde(default)]
    pub account_ids: Vec<String>,
    #[serde(default)]
    pub selection: String,
}

impl ChooseAccounts {
    pub fn builder() -> ChooseAccountsBuilder {
        <ChooseAccountsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChooseAccountsBuilder {
    account_ids: Option<Vec<String>>,
    selection: Option<String>,
}

impl ChooseAccountsBuilder {
    pub fn account_ids(mut self, value: Vec<String>) -> Self {
        self.account_ids = Some(value);
        self
    }

    pub fn selection(mut self, value: impl Into<String>) -> Self {
        self.selection = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChooseAccounts`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account_ids`](ChooseAccountsBuilder::account_ids)
    /// - [`selection`](ChooseAccountsBuilder::selection)
    pub fn build(self) -> Result<ChooseAccounts, BuildError> {
        Ok(ChooseAccounts {
            account_ids: self
                .account_ids
                .ok_or_else(|| BuildError::missing_field("account_ids"))?,
            selection: self
                .selection
                .ok_or_else(|| BuildError::missing_field("selection"))?,
        })
    }
}
