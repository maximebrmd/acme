pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ArticleRejectedEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub violations: Vec<ArticleViolation>,
}

impl ArticleRejectedEncoded {
    pub fn builder() -> ArticleRejectedEncodedBuilder {
        <ArticleRejectedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ArticleRejectedEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    violations: Option<Vec<ArticleViolation>>,
}

impl ArticleRejectedEncodedBuilder {
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

    pub fn violations(mut self, value: Vec<ArticleViolation>) -> Self {
        self.violations = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ArticleRejectedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`violations`](ArticleRejectedEncodedBuilder::violations)
    pub fn build(self) -> Result<ArticleRejectedEncoded, BuildError> {
        Ok(ArticleRejectedEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            violations: self
                .violations
                .ok_or_else(|| BuildError::missing_field("violations"))?,
        })
    }
}
