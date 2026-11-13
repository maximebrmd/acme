pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TextProvider {
    #[serde(rename = "baseUrl")]
    #[serde(default)]
    pub base_url: String,
    #[serde(rename = "keySet")]
    #[serde(default)]
    pub key_set: bool,
    #[serde(rename = "keyUnreadable")]
    #[serde(default)]
    pub key_unreadable: bool,
    pub kind: TextProviderKind,
    #[serde(default)]
    pub model: String,
    #[serde(rename = "updatedAt")]
    #[serde(default)]
    pub updated_at: String,
}

impl TextProvider {
    pub fn builder() -> TextProviderBuilder {
        <TextProviderBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TextProviderBuilder {
    base_url: Option<String>,
    key_set: Option<bool>,
    key_unreadable: Option<bool>,
    kind: Option<TextProviderKind>,
    model: Option<String>,
    updated_at: Option<String>,
}

impl TextProviderBuilder {
    pub fn base_url(mut self, value: impl Into<String>) -> Self {
        self.base_url = Some(value.into());
        self
    }

    pub fn key_set(mut self, value: bool) -> Self {
        self.key_set = Some(value);
        self
    }

    pub fn key_unreadable(mut self, value: bool) -> Self {
        self.key_unreadable = Some(value);
        self
    }

    pub fn kind(mut self, value: TextProviderKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn model(mut self, value: impl Into<String>) -> Self {
        self.model = Some(value.into());
        self
    }

    pub fn updated_at(mut self, value: impl Into<String>) -> Self {
        self.updated_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`TextProvider`].
    /// This method will fail if any of the following fields are not set:
    /// - [`base_url`](TextProviderBuilder::base_url)
    /// - [`key_set`](TextProviderBuilder::key_set)
    /// - [`key_unreadable`](TextProviderBuilder::key_unreadable)
    /// - [`kind`](TextProviderBuilder::kind)
    /// - [`model`](TextProviderBuilder::model)
    /// - [`updated_at`](TextProviderBuilder::updated_at)
    pub fn build(self) -> Result<TextProvider, BuildError> {
        Ok(TextProvider {
            base_url: self
                .base_url
                .ok_or_else(|| BuildError::missing_field("base_url"))?,
            key_set: self
                .key_set
                .ok_or_else(|| BuildError::missing_field("key_set"))?,
            key_unreadable: self
                .key_unreadable
                .ok_or_else(|| BuildError::missing_field("key_unreadable"))?,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
            model: self
                .model
                .ok_or_else(|| BuildError::missing_field("model"))?,
            updated_at: self
                .updated_at
                .ok_or_else(|| BuildError::missing_field("updated_at"))?,
        })
    }
}
