pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Signature {
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "isDefault")]
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub name: String,
    pub scope: SignatureScope,
    #[serde(default)]
    pub text: String,
}

impl Signature {
    pub fn builder() -> SignatureBuilder {
        <SignatureBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SignatureBuilder {
    created_at: Option<String>,
    id: Option<String>,
    is_default: Option<bool>,
    name: Option<String>,
    scope: Option<SignatureScope>,
    text: Option<String>,
}

impl SignatureBuilder {
    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

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

    /// Consumes the builder and constructs a [`Signature`].
    /// This method will fail if any of the following fields are not set:
    /// - [`created_at`](SignatureBuilder::created_at)
    /// - [`id`](SignatureBuilder::id)
    /// - [`is_default`](SignatureBuilder::is_default)
    /// - [`name`](SignatureBuilder::name)
    /// - [`scope`](SignatureBuilder::scope)
    /// - [`text`](SignatureBuilder::text)
    pub fn build(self) -> Result<Signature, BuildError> {
        Ok(Signature {
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            is_default: self
                .is_default
                .ok_or_else(|| BuildError::missing_field("is_default"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            scope: self
                .scope
                .ok_or_else(|| BuildError::missing_field("scope"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
