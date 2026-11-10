pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TooManyReviewLinksEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub limit: i64,
}

impl TooManyReviewLinksEncoded {
    pub fn builder() -> TooManyReviewLinksEncodedBuilder {
        <TooManyReviewLinksEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TooManyReviewLinksEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    limit: Option<i64>,
}

impl TooManyReviewLinksEncodedBuilder {
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

    pub fn limit(mut self, value: i64) -> Self {
        self.limit = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TooManyReviewLinksEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`limit`](TooManyReviewLinksEncodedBuilder::limit)
    pub fn build(self) -> Result<TooManyReviewLinksEncoded, BuildError> {
        Ok(TooManyReviewLinksEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            limit: self
                .limit
                .ok_or_else(|| BuildError::missing_field("limit"))?,
        })
    }
}
