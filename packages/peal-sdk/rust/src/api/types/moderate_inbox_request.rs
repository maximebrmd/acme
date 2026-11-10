pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ModerateInboxRequest {
    pub action: InboxModerationAction,
}

impl ModerateInboxRequest {
    pub fn builder() -> ModerateInboxRequestBuilder {
        <ModerateInboxRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ModerateInboxRequestBuilder {
    action: Option<InboxModerationAction>,
}

impl ModerateInboxRequestBuilder {
    pub fn action(mut self, value: InboxModerationAction) -> Self {
        self.action = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ModerateInboxRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`action`](ModerateInboxRequestBuilder::action)
    pub fn build(self) -> Result<ModerateInboxRequest, BuildError> {
        Ok(ModerateInboxRequest {
            action: self
                .action
                .ok_or_else(|| BuildError::missing_field("action"))?,
        })
    }
}
