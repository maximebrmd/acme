pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PublicationAttempt {
    #[serde(default)]
    pub attempt: i64,
    #[serde(rename = "finishedAt")]
    #[serde(default)]
    pub finished_at: String,
    #[serde(rename = "refusalCode")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refusal_code: Option<String>,
    pub result: AttemptResult,
    #[serde(rename = "retryAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_at: Option<String>,
    #[serde(default)]
    pub round: i64,
    #[serde(rename = "startedAt")]
    #[serde(default)]
    pub started_at: String,
    #[serde(rename = "targetId")]
    #[serde(default)]
    pub target_id: String,
}

impl PublicationAttempt {
    pub fn builder() -> PublicationAttemptBuilder {
        <PublicationAttemptBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PublicationAttemptBuilder {
    attempt: Option<i64>,
    finished_at: Option<String>,
    refusal_code: Option<String>,
    result: Option<AttemptResult>,
    retry_at: Option<String>,
    round: Option<i64>,
    started_at: Option<String>,
    target_id: Option<String>,
}

impl PublicationAttemptBuilder {
    pub fn attempt(mut self, value: i64) -> Self {
        self.attempt = Some(value);
        self
    }

    pub fn finished_at(mut self, value: impl Into<String>) -> Self {
        self.finished_at = Some(value.into());
        self
    }

    pub fn refusal_code(mut self, value: impl Into<String>) -> Self {
        self.refusal_code = Some(value.into());
        self
    }

    pub fn result(mut self, value: AttemptResult) -> Self {
        self.result = Some(value);
        self
    }

    pub fn retry_at(mut self, value: impl Into<String>) -> Self {
        self.retry_at = Some(value.into());
        self
    }

    pub fn round(mut self, value: i64) -> Self {
        self.round = Some(value);
        self
    }

    pub fn started_at(mut self, value: impl Into<String>) -> Self {
        self.started_at = Some(value.into());
        self
    }

    pub fn target_id(mut self, value: impl Into<String>) -> Self {
        self.target_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PublicationAttempt`].
    /// This method will fail if any of the following fields are not set:
    /// - [`attempt`](PublicationAttemptBuilder::attempt)
    /// - [`finished_at`](PublicationAttemptBuilder::finished_at)
    /// - [`result`](PublicationAttemptBuilder::result)
    /// - [`round`](PublicationAttemptBuilder::round)
    /// - [`started_at`](PublicationAttemptBuilder::started_at)
    /// - [`target_id`](PublicationAttemptBuilder::target_id)
    pub fn build(self) -> Result<PublicationAttempt, BuildError> {
        Ok(PublicationAttempt {
            attempt: self
                .attempt
                .ok_or_else(|| BuildError::missing_field("attempt"))?,
            finished_at: self
                .finished_at
                .ok_or_else(|| BuildError::missing_field("finished_at"))?,
            refusal_code: self.refusal_code,
            result: self
                .result
                .ok_or_else(|| BuildError::missing_field("result"))?,
            retry_at: self.retry_at,
            round: self
                .round
                .ok_or_else(|| BuildError::missing_field("round"))?,
            started_at: self
                .started_at
                .ok_or_else(|| BuildError::missing_field("started_at"))?,
            target_id: self
                .target_id
                .ok_or_else(|| BuildError::missing_field("target_id"))?,
        })
    }
}
