pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewInboxReply {
    #[serde(default)]
    pub text: String,
}

impl NewInboxReply {
    pub fn builder() -> NewInboxReplyBuilder {
        <NewInboxReplyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewInboxReplyBuilder {
    text: Option<String>,
}

impl NewInboxReplyBuilder {
    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewInboxReply`].
    /// This method will fail if any of the following fields are not set:
    /// - [`text`](NewInboxReplyBuilder::text)
    pub fn build(self) -> Result<NewInboxReply, BuildError> {
        Ok(NewInboxReply {
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
