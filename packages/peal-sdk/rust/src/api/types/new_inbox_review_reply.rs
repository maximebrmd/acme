pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewInboxReviewReply {
    #[serde(default)]
    pub text: String,
}

impl NewInboxReviewReply {
    pub fn builder() -> NewInboxReviewReplyBuilder {
        <NewInboxReviewReplyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewInboxReviewReplyBuilder {
    text: Option<String>,
}

impl NewInboxReviewReplyBuilder {
    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewInboxReviewReply`].
    /// This method will fail if any of the following fields are not set:
    /// - [`text`](NewInboxReviewReplyBuilder::text)
    pub fn build(self) -> Result<NewInboxReviewReply, BuildError> {
        Ok(NewInboxReviewReply {
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
