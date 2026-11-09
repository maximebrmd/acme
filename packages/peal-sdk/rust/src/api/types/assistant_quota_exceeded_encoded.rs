pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AssistantQuotaExceededEncoded {
    #[serde(rename = "_tag")]
    pub tag: AssistantQuotaExceededEncodedTag,
    #[serde(rename = "dailyLimit")]
    #[serde(default)]
    pub daily_limit: i64,
    #[serde(rename = "resetsAt")]
    #[serde(default)]
    pub resets_at: String,
}

impl AssistantQuotaExceededEncoded {
    pub fn builder() -> AssistantQuotaExceededEncodedBuilder {
        <AssistantQuotaExceededEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AssistantQuotaExceededEncodedBuilder {
    tag: Option<AssistantQuotaExceededEncodedTag>,
    daily_limit: Option<i64>,
    resets_at: Option<String>,
}

impl AssistantQuotaExceededEncodedBuilder {
    pub fn tag(mut self, value: AssistantQuotaExceededEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn daily_limit(mut self, value: i64) -> Self {
        self.daily_limit = Some(value);
        self
    }

    pub fn resets_at(mut self, value: impl Into<String>) -> Self {
        self.resets_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AssistantQuotaExceededEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](AssistantQuotaExceededEncodedBuilder::tag)
    /// - [`daily_limit`](AssistantQuotaExceededEncodedBuilder::daily_limit)
    /// - [`resets_at`](AssistantQuotaExceededEncodedBuilder::resets_at)
    pub fn build(self) -> Result<AssistantQuotaExceededEncoded, BuildError> {
        Ok(AssistantQuotaExceededEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            daily_limit: self
                .daily_limit
                .ok_or_else(|| BuildError::missing_field("daily_limit"))?,
            resets_at: self
                .resets_at
                .ok_or_else(|| BuildError::missing_field("resets_at"))?,
        })
    }
}
