pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TextProviderSetting {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<TextProvider>,
}

impl TextProviderSetting {
    pub fn builder() -> TextProviderSettingBuilder {
        <TextProviderSettingBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TextProviderSettingBuilder {
    provider: Option<TextProvider>,
}

impl TextProviderSettingBuilder {
    pub fn provider(mut self, value: TextProvider) -> Self {
        self.provider = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TextProviderSetting`].
    pub fn build(self) -> Result<TextProviderSetting, BuildError> {
        Ok(TextProviderSetting {
            provider: self.provider,
        })
    }
}
