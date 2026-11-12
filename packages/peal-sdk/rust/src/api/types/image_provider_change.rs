pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ImageProviderChange {
    #[serde(rename = "apiKey")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
    #[serde(rename = "baseUrl")]
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub model: String,
}

impl ImageProviderChange {
    pub fn builder() -> ImageProviderChangeBuilder {
        <ImageProviderChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ImageProviderChangeBuilder {
    api_key: Option<String>,
    base_url: Option<String>,
    model: Option<String>,
}

impl ImageProviderChangeBuilder {
    pub fn api_key(mut self, value: impl Into<String>) -> Self {
        self.api_key = Some(value.into());
        self
    }

    pub fn base_url(mut self, value: impl Into<String>) -> Self {
        self.base_url = Some(value.into());
        self
    }

    pub fn model(mut self, value: impl Into<String>) -> Self {
        self.model = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ImageProviderChange`].
    /// This method will fail if any of the following fields are not set:
    /// - [`base_url`](ImageProviderChangeBuilder::base_url)
    /// - [`model`](ImageProviderChangeBuilder::model)
    pub fn build(self) -> Result<ImageProviderChange, BuildError> {
        Ok(ImageProviderChange {
            api_key: self.api_key,
            base_url: self
                .base_url
                .ok_or_else(|| BuildError::missing_field("base_url"))?,
            model: self
                .model
                .ok_or_else(|| BuildError::missing_field("model"))?,
        })
    }
}
