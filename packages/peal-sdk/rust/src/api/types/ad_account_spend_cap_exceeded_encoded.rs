pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AdAccountSpendCapExceededEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub requested: i64,
    #[serde(default)]
    pub room: i64,
}

impl AdAccountSpendCapExceededEncoded {
    pub fn builder() -> AdAccountSpendCapExceededEncodedBuilder {
        <AdAccountSpendCapExceededEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdAccountSpendCapExceededEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    currency: Option<String>,
    requested: Option<i64>,
    room: Option<i64>,
}

impl AdAccountSpendCapExceededEncodedBuilder {
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

    pub fn currency(mut self, value: impl Into<String>) -> Self {
        self.currency = Some(value.into());
        self
    }

    pub fn requested(mut self, value: i64) -> Self {
        self.requested = Some(value);
        self
    }

    pub fn room(mut self, value: i64) -> Self {
        self.room = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdAccountSpendCapExceededEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`currency`](AdAccountSpendCapExceededEncodedBuilder::currency)
    /// - [`requested`](AdAccountSpendCapExceededEncodedBuilder::requested)
    /// - [`room`](AdAccountSpendCapExceededEncodedBuilder::room)
    pub fn build(self) -> Result<AdAccountSpendCapExceededEncoded, BuildError> {
        Ok(AdAccountSpendCapExceededEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            currency: self
                .currency
                .ok_or_else(|| BuildError::missing_field("currency"))?,
            requested: self
                .requested
                .ok_or_else(|| BuildError::missing_field("requested"))?,
            room: self.room.ok_or_else(|| BuildError::missing_field("room"))?,
        })
    }
}
