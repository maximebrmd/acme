pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct BoostInvalidEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub violations: Vec<BoostViolation>,
}

impl BoostInvalidEncoded {
    pub fn builder() -> BoostInvalidEncodedBuilder {
        <BoostInvalidEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BoostInvalidEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    violations: Option<Vec<BoostViolation>>,
}

impl BoostInvalidEncodedBuilder {
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

    pub fn violations(mut self, value: Vec<BoostViolation>) -> Self {
        self.violations = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BoostInvalidEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`violations`](BoostInvalidEncodedBuilder::violations)
    pub fn build(self) -> Result<BoostInvalidEncoded, BuildError> {
        Ok(BoostInvalidEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            violations: self
                .violations
                .ok_or_else(|| BuildError::missing_field("violations"))?,
        })
    }
}
