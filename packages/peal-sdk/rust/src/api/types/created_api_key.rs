pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CreatedApiKey {
    #[serde(rename = "apiKey")]
    #[serde(default)]
    pub api_key: ApiKey,
    #[serde(default)]
    pub key: String,
}

impl CreatedApiKey {
    pub fn builder() -> CreatedApiKeyBuilder {
        <CreatedApiKeyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CreatedApiKeyBuilder {
    api_key: Option<ApiKey>,
    key: Option<String>,
}

impl CreatedApiKeyBuilder {
    pub fn api_key(mut self, value: ApiKey) -> Self {
        self.api_key = Some(value);
        self
    }

    pub fn key(mut self, value: impl Into<String>) -> Self {
        self.key = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CreatedApiKey`].
    /// This method will fail if any of the following fields are not set:
    /// - [`api_key`](CreatedApiKeyBuilder::api_key)
    /// - [`key`](CreatedApiKeyBuilder::key)
    pub fn build(self) -> Result<CreatedApiKey, BuildError> {
        Ok(CreatedApiKey {
            api_key: self
                .api_key
                .ok_or_else(|| BuildError::missing_field("api_key"))?,
            key: self.key.ok_or_else(|| BuildError::missing_field("key"))?,
        })
    }
}
