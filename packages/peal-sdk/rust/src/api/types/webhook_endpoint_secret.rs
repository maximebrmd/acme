pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WebhookEndpointSecret {
    pub endpoint: WebhookEndpoint,
    #[serde(default)]
    pub secret: String,
}

impl WebhookEndpointSecret {
    pub fn builder() -> WebhookEndpointSecretBuilder {
        <WebhookEndpointSecretBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookEndpointSecretBuilder {
    endpoint: Option<WebhookEndpoint>,
    secret: Option<String>,
}

impl WebhookEndpointSecretBuilder {
    pub fn endpoint(mut self, value: WebhookEndpoint) -> Self {
        self.endpoint = Some(value);
        self
    }

    pub fn secret(mut self, value: impl Into<String>) -> Self {
        self.secret = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`WebhookEndpointSecret`].
    /// This method will fail if any of the following fields are not set:
    /// - [`endpoint`](WebhookEndpointSecretBuilder::endpoint)
    /// - [`secret`](WebhookEndpointSecretBuilder::secret)
    pub fn build(self) -> Result<WebhookEndpointSecret, BuildError> {
        Ok(WebhookEndpointSecret {
            endpoint: self
                .endpoint
                .ok_or_else(|| BuildError::missing_field("endpoint"))?,
            secret: self
                .secret
                .ok_or_else(|| BuildError::missing_field("secret"))?,
        })
    }
}
