pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AssistantStatus {
    #[serde(default)]
    pub available: bool,
    #[serde(rename = "dailyLimit")]
    #[serde(default)]
    pub daily_limit: i64,
    #[serde(default)]
    pub images: AssistantImagesStatus,
    #[serde(rename = "maxTextLength")]
    #[serde(default)]
    pub max_text_length: i64,
    #[serde(default)]
    pub remaining: i64,
    #[serde(rename = "resetsAt")]
    #[serde(default)]
    pub resets_at: String,
}

impl AssistantStatus {
    pub fn builder() -> AssistantStatusBuilder {
        <AssistantStatusBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AssistantStatusBuilder {
    available: Option<bool>,
    daily_limit: Option<i64>,
    images: Option<AssistantImagesStatus>,
    max_text_length: Option<i64>,
    remaining: Option<i64>,
    resets_at: Option<String>,
}

impl AssistantStatusBuilder {
    pub fn available(mut self, value: bool) -> Self {
        self.available = Some(value);
        self
    }

    pub fn daily_limit(mut self, value: i64) -> Self {
        self.daily_limit = Some(value);
        self
    }

    pub fn images(mut self, value: AssistantImagesStatus) -> Self {
        self.images = Some(value);
        self
    }

    pub fn max_text_length(mut self, value: i64) -> Self {
        self.max_text_length = Some(value);
        self
    }

    pub fn remaining(mut self, value: i64) -> Self {
        self.remaining = Some(value);
        self
    }

    pub fn resets_at(mut self, value: impl Into<String>) -> Self {
        self.resets_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AssistantStatus`].
    /// This method will fail if any of the following fields are not set:
    /// - [`available`](AssistantStatusBuilder::available)
    /// - [`daily_limit`](AssistantStatusBuilder::daily_limit)
    /// - [`images`](AssistantStatusBuilder::images)
    /// - [`max_text_length`](AssistantStatusBuilder::max_text_length)
    /// - [`remaining`](AssistantStatusBuilder::remaining)
    /// - [`resets_at`](AssistantStatusBuilder::resets_at)
    pub fn build(self) -> Result<AssistantStatus, BuildError> {
        Ok(AssistantStatus {
            available: self
                .available
                .ok_or_else(|| BuildError::missing_field("available"))?,
            daily_limit: self
                .daily_limit
                .ok_or_else(|| BuildError::missing_field("daily_limit"))?,
            images: self
                .images
                .ok_or_else(|| BuildError::missing_field("images"))?,
            max_text_length: self
                .max_text_length
                .ok_or_else(|| BuildError::missing_field("max_text_length"))?,
            remaining: self
                .remaining
                .ok_or_else(|| BuildError::missing_field("remaining"))?,
            resets_at: self
                .resets_at
                .ok_or_else(|| BuildError::missing_field("resets_at"))?,
        })
    }
}
