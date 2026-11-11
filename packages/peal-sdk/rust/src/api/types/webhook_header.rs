pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WebhookHeader {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub value: String,
}

impl WebhookHeader {
    pub fn builder() -> WebhookHeaderBuilder {
        <WebhookHeaderBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookHeaderBuilder {
    name: Option<String>,
    value: Option<String>,
}

impl WebhookHeaderBuilder {
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn value(mut self, value: impl Into<String>) -> Self {
        self.value = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`WebhookHeader`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](WebhookHeaderBuilder::name)
    /// - [`value`](WebhookHeaderBuilder::value)
    pub fn build(self) -> Result<WebhookHeader, BuildError> {
        Ok(WebhookHeader {
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            value: self
                .value
                .ok_or_else(|| BuildError::missing_field("value"))?,
        })
    }
}
