pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct OwnTextLimitReachedEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "dailyLimit")]
    #[serde(default)]
    pub daily_limit: i64,
    #[serde(rename = "resetsAt")]
    #[serde(default)]
    pub resets_at: String,
}

impl OwnTextLimitReachedEncoded {
    pub fn builder() -> OwnTextLimitReachedEncodedBuilder {
        <OwnTextLimitReachedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct OwnTextLimitReachedEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    daily_limit: Option<i64>,
    resets_at: Option<String>,
}

impl OwnTextLimitReachedEncodedBuilder {
    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
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

    /// Consumes the builder and constructs a [`OwnTextLimitReachedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`daily_limit`](OwnTextLimitReachedEncodedBuilder::daily_limit)
    /// - [`resets_at`](OwnTextLimitReachedEncodedBuilder::resets_at)
    pub fn build(self) -> Result<OwnTextLimitReachedEncoded, BuildError> {
        Ok(OwnTextLimitReachedEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            daily_limit: self
                .daily_limit
                .ok_or_else(|| BuildError::missing_field("daily_limit"))?,
            resets_at: self
                .resets_at
                .ok_or_else(|| BuildError::missing_field("resets_at"))?,
        })
    }
}
