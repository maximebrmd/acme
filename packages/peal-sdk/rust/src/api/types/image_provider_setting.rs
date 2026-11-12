pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ImageProviderSetting {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<ImageProvider>,
}

impl ImageProviderSetting {
    pub fn builder() -> ImageProviderSettingBuilder {
        <ImageProviderSettingBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ImageProviderSettingBuilder {
    provider: Option<ImageProvider>,
}

impl ImageProviderSettingBuilder {
    pub fn provider(mut self, value: ImageProvider) -> Self {
        self.provider = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ImageProviderSetting`].
    pub fn build(self) -> Result<ImageProviderSetting, BuildError> {
        Ok(ImageProviderSetting {
            provider: self.provider,
        })
    }
}
