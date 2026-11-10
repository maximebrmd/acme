pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SetAnsweredInboxRequest {
    #[serde(default)]
    pub answered: bool,
}

impl SetAnsweredInboxRequest {
    pub fn builder() -> SetAnsweredInboxRequestBuilder {
        <SetAnsweredInboxRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SetAnsweredInboxRequestBuilder {
    answered: Option<bool>,
}

impl SetAnsweredInboxRequestBuilder {
    pub fn answered(mut self, value: bool) -> Self {
        self.answered = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`SetAnsweredInboxRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`answered`](SetAnsweredInboxRequestBuilder::answered)
    pub fn build(self) -> Result<SetAnsweredInboxRequest, BuildError> {
        Ok(SetAnsweredInboxRequest {
            answered: self
                .answered
                .ok_or_else(|| BuildError::missing_field("answered"))?,
        })
    }
}
