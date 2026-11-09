pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SuggestionRequest {
    pub action: AssistantAction,
    #[serde(default)]
    pub text: String,
}

impl SuggestionRequest {
    pub fn builder() -> SuggestionRequestBuilder {
        <SuggestionRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SuggestionRequestBuilder {
    action: Option<AssistantAction>,
    text: Option<String>,
}

impl SuggestionRequestBuilder {
    pub fn action(mut self, value: AssistantAction) -> Self {
        self.action = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`SuggestionRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`action`](SuggestionRequestBuilder::action)
    /// - [`text`](SuggestionRequestBuilder::text)
    pub fn build(self) -> Result<SuggestionRequest, BuildError> {
        Ok(SuggestionRequest {
            action: self
                .action
                .ok_or_else(|| BuildError::missing_field("action"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
