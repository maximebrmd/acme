pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PostContentInvalidEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub violations: Vec<ContentViolation>,
}

impl PostContentInvalidEncoded {
    pub fn builder() -> PostContentInvalidEncodedBuilder {
        <PostContentInvalidEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostContentInvalidEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    violations: Option<Vec<ContentViolation>>,
}

impl PostContentInvalidEncodedBuilder {
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

    pub fn violations(mut self, value: Vec<ContentViolation>) -> Self {
        self.violations = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostContentInvalidEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`violations`](PostContentInvalidEncodedBuilder::violations)
    pub fn build(self) -> Result<PostContentInvalidEncoded, BuildError> {
        Ok(PostContentInvalidEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            violations: self
                .violations
                .ok_or_else(|| BuildError::missing_field("violations"))?,
        })
    }
}
