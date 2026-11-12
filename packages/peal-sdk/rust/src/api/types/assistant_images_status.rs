pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AssistantImagesStatus {
    #[serde(default)]
    pub aspects: Vec<ImageAspect>,
    #[serde(default)]
    pub available: bool,
    #[serde(rename = "dailyLimit")]
    #[serde(default)]
    pub daily_limit: i64,
    #[serde(rename = "maxPromptLength")]
    #[serde(default)]
    pub max_prompt_length: i64,
    #[serde(rename = "requestCost")]
    #[serde(default)]
    pub request_cost: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<AssistantImageSource>,
}

impl AssistantImagesStatus {
    pub fn builder() -> AssistantImagesStatusBuilder {
        <AssistantImagesStatusBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AssistantImagesStatusBuilder {
    aspects: Option<Vec<ImageAspect>>,
    available: Option<bool>,
    daily_limit: Option<i64>,
    max_prompt_length: Option<i64>,
    request_cost: Option<i64>,
    source: Option<AssistantImageSource>,
}

impl AssistantImagesStatusBuilder {
    pub fn aspects(mut self, value: Vec<ImageAspect>) -> Self {
        self.aspects = Some(value);
        self
    }

    pub fn available(mut self, value: bool) -> Self {
        self.available = Some(value);
        self
    }

    pub fn daily_limit(mut self, value: i64) -> Self {
        self.daily_limit = Some(value);
        self
    }

    pub fn max_prompt_length(mut self, value: i64) -> Self {
        self.max_prompt_length = Some(value);
        self
    }

    pub fn request_cost(mut self, value: i64) -> Self {
        self.request_cost = Some(value);
        self
    }

    pub fn source(mut self, value: AssistantImageSource) -> Self {
        self.source = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AssistantImagesStatus`].
    /// This method will fail if any of the following fields are not set:
    /// - [`aspects`](AssistantImagesStatusBuilder::aspects)
    /// - [`available`](AssistantImagesStatusBuilder::available)
    /// - [`daily_limit`](AssistantImagesStatusBuilder::daily_limit)
    /// - [`max_prompt_length`](AssistantImagesStatusBuilder::max_prompt_length)
    /// - [`request_cost`](AssistantImagesStatusBuilder::request_cost)
    pub fn build(self) -> Result<AssistantImagesStatus, BuildError> {
        Ok(AssistantImagesStatus {
            aspects: self
                .aspects
                .ok_or_else(|| BuildError::missing_field("aspects"))?,
            available: self
                .available
                .ok_or_else(|| BuildError::missing_field("available"))?,
            daily_limit: self
                .daily_limit
                .ok_or_else(|| BuildError::missing_field("daily_limit"))?,
            max_prompt_length: self
                .max_prompt_length
                .ok_or_else(|| BuildError::missing_field("max_prompt_length"))?,
            request_cost: self
                .request_cost
                .ok_or_else(|| BuildError::missing_field("request_cost"))?,
            source: self.source,
        })
    }
}
