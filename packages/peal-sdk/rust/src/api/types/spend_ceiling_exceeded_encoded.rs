pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct SpendCeilingExceededEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub ceiling: i64,
    #[serde(default)]
    pub committed: i64,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub requested: i64,
}

impl SpendCeilingExceededEncoded {
    pub fn builder() -> SpendCeilingExceededEncodedBuilder {
        <SpendCeilingExceededEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SpendCeilingExceededEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    ceiling: Option<i64>,
    committed: Option<i64>,
    currency: Option<String>,
    requested: Option<i64>,
}

impl SpendCeilingExceededEncodedBuilder {
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

    pub fn ceiling(mut self, value: i64) -> Self {
        self.ceiling = Some(value);
        self
    }

    pub fn committed(mut self, value: i64) -> Self {
        self.committed = Some(value);
        self
    }

    pub fn currency(mut self, value: impl Into<String>) -> Self {
        self.currency = Some(value.into());
        self
    }

    pub fn requested(mut self, value: i64) -> Self {
        self.requested = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`SpendCeilingExceededEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`ceiling`](SpendCeilingExceededEncodedBuilder::ceiling)
    /// - [`committed`](SpendCeilingExceededEncodedBuilder::committed)
    /// - [`currency`](SpendCeilingExceededEncodedBuilder::currency)
    /// - [`requested`](SpendCeilingExceededEncodedBuilder::requested)
    pub fn build(self) -> Result<SpendCeilingExceededEncoded, BuildError> {
        Ok(SpendCeilingExceededEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            ceiling: self
                .ceiling
                .ok_or_else(|| BuildError::missing_field("ceiling"))?,
            committed: self
                .committed
                .ok_or_else(|| BuildError::missing_field("committed"))?,
            currency: self
                .currency
                .ok_or_else(|| BuildError::missing_field("currency"))?,
            requested: self
                .requested
                .ok_or_else(|| BuildError::missing_field("requested"))?,
        })
    }
}
