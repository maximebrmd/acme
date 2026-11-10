pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct SignatureDetails {
    #[serde(rename = "isDefault")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_default: Option<bool>,
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<SignatureScope>,
    #[serde(default)]
    pub text: String,
}

impl SignatureDetails {
    pub fn builder() -> SignatureDetailsBuilder {
        <SignatureDetailsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SignatureDetailsBuilder {
    is_default: Option<bool>,
    name: Option<String>,
    scope: Option<SignatureScope>,
    text: Option<String>,
}

impl SignatureDetailsBuilder {
    pub fn is_default(mut self, value: bool) -> Self {
        self.is_default = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn scope(mut self, value: SignatureScope) -> Self {
        self.scope = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`SignatureDetails`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](SignatureDetailsBuilder::name)
    /// - [`text`](SignatureDetailsBuilder::text)
    pub fn build(self) -> Result<SignatureDetails, BuildError> {
        Ok(SignatureDetails {
            is_default: self.is_default,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            scope: self.scope,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
