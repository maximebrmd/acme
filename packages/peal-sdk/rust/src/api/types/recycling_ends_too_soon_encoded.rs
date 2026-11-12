pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RecyclingEndsTooSoonEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "firstDueAt")]
    #[serde(default)]
    pub first_due_at: String,
}

impl RecyclingEndsTooSoonEncoded {
    pub fn builder() -> RecyclingEndsTooSoonEncodedBuilder {
        <RecyclingEndsTooSoonEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingEndsTooSoonEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    first_due_at: Option<String>,
}

impl RecyclingEndsTooSoonEncodedBuilder {
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

    pub fn first_due_at(mut self, value: impl Into<String>) -> Self {
        self.first_due_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`RecyclingEndsTooSoonEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`first_due_at`](RecyclingEndsTooSoonEncodedBuilder::first_due_at)
    pub fn build(self) -> Result<RecyclingEndsTooSoonEncoded, BuildError> {
        Ok(RecyclingEndsTooSoonEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            first_due_at: self
                .first_due_at
                .ok_or_else(|| BuildError::missing_field("first_due_at"))?,
        })
    }
}
