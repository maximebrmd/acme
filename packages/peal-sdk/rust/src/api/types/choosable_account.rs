pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChoosableAccount {
    #[serde(rename = "accountId")]
    #[serde(default)]
    pub account_id: String,
    #[serde(rename = "avatarUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    #[serde(default)]
    pub connected: bool,
    #[serde(rename = "displayName")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(default)]
    pub handle: String,
}

impl ChoosableAccount {
    pub fn builder() -> ChoosableAccountBuilder {
        <ChoosableAccountBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChoosableAccountBuilder {
    account_id: Option<String>,
    avatar_url: Option<String>,
    connected: Option<bool>,
    display_name: Option<String>,
    handle: Option<String>,
}

impl ChoosableAccountBuilder {
    pub fn account_id(mut self, value: impl Into<String>) -> Self {
        self.account_id = Some(value.into());
        self
    }

    pub fn avatar_url(mut self, value: impl Into<String>) -> Self {
        self.avatar_url = Some(value.into());
        self
    }

    pub fn connected(mut self, value: bool) -> Self {
        self.connected = Some(value);
        self
    }

    pub fn display_name(mut self, value: impl Into<String>) -> Self {
        self.display_name = Some(value.into());
        self
    }

    pub fn handle(mut self, value: impl Into<String>) -> Self {
        self.handle = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChoosableAccount`].
    /// This method will fail if any of the following fields are not set:
    /// - [`account_id`](ChoosableAccountBuilder::account_id)
    /// - [`connected`](ChoosableAccountBuilder::connected)
    /// - [`handle`](ChoosableAccountBuilder::handle)
    pub fn build(self) -> Result<ChoosableAccount, BuildError> {
        Ok(ChoosableAccount {
            account_id: self
                .account_id
                .ok_or_else(|| BuildError::missing_field("account_id"))?,
            avatar_url: self.avatar_url,
            connected: self
                .connected
                .ok_or_else(|| BuildError::missing_field("connected"))?,
            display_name: self.display_name,
            handle: self
                .handle
                .ok_or_else(|| BuildError::missing_field("handle"))?,
        })
    }
}
