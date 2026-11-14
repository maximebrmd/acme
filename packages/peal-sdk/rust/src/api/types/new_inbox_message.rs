pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewInboxMessage {
    #[serde(default)]
    pub text: String,
}

impl NewInboxMessage {
    pub fn builder() -> NewInboxMessageBuilder {
        <NewInboxMessageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewInboxMessageBuilder {
    text: Option<String>,
}

impl NewInboxMessageBuilder {
    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewInboxMessage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`text`](NewInboxMessageBuilder::text)
    pub fn build(self) -> Result<NewInboxMessage, BuildError> {
        Ok(NewInboxMessage {
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
