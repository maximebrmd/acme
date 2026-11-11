pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WebhookHeaderChange {
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
}

impl WebhookHeaderChange {
    pub fn builder() -> WebhookHeaderChangeBuilder {
        <WebhookHeaderChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WebhookHeaderChangeBuilder {
    name: Option<String>,
    value: Option<String>,
}

impl WebhookHeaderChangeBuilder {
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn value(mut self, value: impl Into<String>) -> Self {
        self.value = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`WebhookHeaderChange`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](WebhookHeaderChangeBuilder::name)
    pub fn build(self) -> Result<WebhookHeaderChange, BuildError> {
        Ok(WebhookHeaderChange {
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            value: self.value,
        })
    }
}
