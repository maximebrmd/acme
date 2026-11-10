pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct BoostStateConflictEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub state: String,
}

impl BoostStateConflictEncoded {
    pub fn builder() -> BoostStateConflictEncodedBuilder {
        <BoostStateConflictEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BoostStateConflictEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    state: Option<String>,
}

impl BoostStateConflictEncodedBuilder {
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

    pub fn state(mut self, value: impl Into<String>) -> Self {
        self.state = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`BoostStateConflictEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`state`](BoostStateConflictEncodedBuilder::state)
    pub fn build(self) -> Result<BoostStateConflictEncoded, BuildError> {
        Ok(BoostStateConflictEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            state: self
                .state
                .ok_or_else(|| BuildError::missing_field("state"))?,
        })
    }
}
